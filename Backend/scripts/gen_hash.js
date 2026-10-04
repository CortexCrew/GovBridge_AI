const bcrypt = require('bcryptjs');

const password = 'RajOfficer@2026';

bcrypt.hash(password, 10).then(hash => {
  console.log('Plain password :', password);
  console.log('Bcrypt hash    :', hash);
});
