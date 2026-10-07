const fs = require('fs');
const path = require('path');
const repository = require('./locker.repository');
const blobStorage = require('../../services/blob-storage.service');

// Same directory the upload middleware writes to.
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

const DOWNLOAD_KINDS = {
  issued: 'issued_certificate',
  document: 'uploaded_document',
};

const fileNameOf = (filePath) => path.basename(String(filePath).split('\\').join('/'));

class LockerService {
  async init() {
    await repository.init();
  }

  /**
   * All locker files for a citizen: officer-issued certificates and the
   * documents they uploaded with their applications. Empty when none exist.
   * @param {number} userId
   */
  async getUserLocker(userId) {
    const items = await repository.getItemsByUser(userId);

    return items.map((item) => {
      const kind = item.source === DOWNLOAD_KINDS.issued ? 'issued' : 'document';
      return {
        source: item.source,
        item_id: item.item_id,
        application_id: item.application_id,
        certificate_type: item.certificate_type,
        document_type: item.document_type,
        file_name: item.file_name || fileNameOf(item.file_path),
        content_type: item.content_type || null,
        storage_provider: item.storage_provider || 'local',
        uploaded_at: item.uploaded_at,
        download_url: `/api/locker/download/${kind}/${item.item_id}`,
      };
    });
  }

  /**
   * Resolve a locker file to a path on disk after checking the citizen owns it.
   * @param {number} userId
   * @param {'issued'|'document'} kind
   * @param {number} id - application_id for issued, document_id for document
   */
  async getDownload(userId, kind, id) {
    let record = null;
    if (kind === 'issued') {
      record = await repository.findIssuedCertificate(userId, id);
    } else if (kind === 'document') {
      record = await repository.findUploadedDocument(userId, id);
    }

    if (!record) {
      const err = new Error('File not found');
      err.statusCode = 404;
      throw err;
    }

    if (kind === 'document' && record.storage_provider === 'azure') {
      const fileName = record.file_name || fileNameOf(record.file_path);
      const contentType = record.content_type || 'application/octet-stream';
      const disposition = contentType === 'application/pdf' ? 'inline' : 'attachment';
      return {
        ...(await blobStorage.createReadUrl(record.file_path, fileName, contentType, disposition)),
        fileName,
        contentType,
        isSas: true
      };
    }

    // Legacy files remain confined to the existing upload directory.
    const fileName = fileNameOf(record.file_path);
    const absolutePath = path.join(UPLOAD_DIR, fileName);
    if (!fs.existsSync(absolutePath)) {
      const err = new Error('File is no longer available');
      err.statusCode = 404;
      throw err;
    }

    return { absolutePath, fileName };
  }

  async getDocumentAccess(userId, kind, id, disposition) {
    let record = null;
    if (kind === 'issued') {
      record = await repository.findIssuedCertificate(userId, id);
    } else if (kind === 'document') {
      record = await repository.findUploadedDocument(userId, id);
    }

    if (!record) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }

    if (kind === 'document' && record.storage_provider === 'azure') {
      const fileName = record.file_name || fileNameOf(record.file_path);
      const contentType = record.content_type || 'application/octet-stream';
      return {
        ...(await blobStorage.createReadUrl(record.file_path, fileName, contentType, disposition)),
        file_name: fileName,
        content_type: contentType
      };
    }

    const { absolutePath, fileName } = await this.getDownload(userId, kind, id);
    return { url: null, local_url: `/api/locker/download/${kind}/${id}`, file_name: fileName, absolutePath };
  }
}

module.exports = new LockerService();
