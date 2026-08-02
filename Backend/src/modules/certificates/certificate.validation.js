function validateApplication(req, res, next) {
  const { certificate_type } = req.body;
  if (!certificate_type) {
    return res.status(400).json({ success: false, message: 'certificate_type is required' });
  }
  next();
}

function validateReview(req, res, next) {
  const { status } = req.body;
  const validStatuses = ['Approved', 'Rejected'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Valid status (Approved, Rejected) is required' });
  }
  next();
}

module.exports = {
  validateApplication,
  validateReview
};
