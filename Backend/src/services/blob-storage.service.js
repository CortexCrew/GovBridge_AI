const { BlobServiceClient, BlobSASPermissions } = require('@azure/storage-blob');
const env = require('../config/env');

let containerClient;

function getContainerClient() {
  if (!env.AZURE_STORAGE_CONNECTION_STRING) {
    const error = new Error('Azure Blob Storage is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  if (!containerClient) {
    const serviceClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    containerClient = serviceClient.getContainerClient(env.AZURE_STORAGE_CONTAINER);
  }
  return containerClient;
}

function safeDispositionName(fileName) {
  return String(fileName || 'document').replace(/[\\"\r\n]/g, '_');
}

async function uploadFile(file, blobName) {
  try {
    const blobClient = getContainerClient().getBlockBlobClient(blobName);
    await blobClient.uploadFile(file.path, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
        blobContentDisposition: `attachment; filename="${safeDispositionName(file.originalname)}"`,
        blobCacheControl: 'private, no-store'
      }
    });
    return blobName;
  } catch (cause) {
    if (cause.statusCode) throw cause;
    const error = new Error('Unable to upload document to Azure Blob Storage');
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }
}

async function deleteFile(blobName) {
  try {
    await getContainerClient().getBlobClient(blobName).deleteIfExists();
  } catch (error) {
    console.warn('Azure document cleanup failed:', error.message);
  }
}

async function createReadUrl(blobName, fileName, contentType, disposition = 'attachment') {
  try {
    const blobClient = getContainerClient().getBlobClient(blobName);
    if (!(await blobClient.exists())) {
      const error = new Error('Document not found in Azure Blob Storage');
      error.statusCode = 404;
      throw error;
    }
    const expiresOn = new Date(Date.now() + 5 * 60 * 1000);
    const url = await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
      contentType,
      contentDisposition: `${disposition}; filename="${safeDispositionName(fileName)}"`
    });
    return { url, expires_at: expiresOn.toISOString() };
  } catch (cause) {
    if (cause.statusCode) throw cause;
    const error = new Error('Unable to generate secure document access');
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }
}

module.exports = { uploadFile, deleteFile, createReadUrl };