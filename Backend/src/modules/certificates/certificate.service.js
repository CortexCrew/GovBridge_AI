const repository = require('./certificate.repository');

class CertificateService {
  async init() {
    await repository.createTables();
  }

  async applyForCertificate(userId, certificateType, files) {
    if (!files || files.length === 0) {
      throw { statusCode: 400, message: 'At least one document must be uploaded' };
    }

    // Create the application record
    const application = await repository.createApplication(userId, certificateType);

    // Save all uploaded documents
    const savedDocuments = [];
    for (const file of files) {
      // In a real scenario, you might get documentType from the form data
      const docType = file.fieldname || 'Supporting Document'; 
      const doc = await repository.saveDocument(application.id, userId, file.path, docType);
      savedDocuments.push(doc);
    }

    return { ...application, documents: savedDocuments };
  }

  async trackApplication(userId) {
    const applications = await repository.getApplicationsByUser(userId);
    return applications;
  }
  
  async getApplicationDetails(applicationId, userId) {
    const application = await repository.getApplicationById(applicationId);
    
    if (!application) {
      throw { statusCode: 404, message: 'Application not found' };
    }

    // Assuming we only allow the user who created it (or an officer) to see it
    if (application.user_id !== userId) {
      throw { statusCode: 403, message: 'Access denied' };
    }

    const documents = await repository.getDocumentsByApplicationId(applicationId);
    return { ...application, documents };
  }

  async reviewApplication(applicationId, status, remarks, certificateFilePath = null) {
    const application = await repository.updateApplicationStatus(applicationId, status, remarks);
    
    if (!application) {
      throw { statusCode: 404, message: 'Application not found' };
    }

    let digitalLockerRecord = null;
    // If approved and a certificate was generated
    if (status === 'Approved' && certificateFilePath) {
      digitalLockerRecord = await repository.saveToDigitalLocker(
        application.user_id,
        application.id,
        certificateFilePath
      );
    }

    return { application, digitalLockerRecord };
  }

  async getDigitalLocker(userId) {
    const certificates = await repository.getDigitalLockerByUser(userId);
    return certificates;
  }
}

module.exports = new CertificateService();
