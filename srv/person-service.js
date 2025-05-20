const cds = require('@sap/cds');
const multer = require('multer');
const { parse } = require('csv-parse');
const { Readable } = require('stream');

module.exports = cds.service.impl(async function() {
  const { Person } = this.entities;
  let tempData = [];

  this.on('uploadCSV', async (req) => {
    const file = req.data.file;
    tempData = [];
    
    return new Promise((resolve, reject) => {
      const parser = parse({
        columns: true,
        skip_empty_lines: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          const birthDate = new Date(record.birthDate);
          const age = calculateAge(birthDate);
          
          tempData.push({
            ID: parseInt(record.ID),
            name: record.name,
            birthDate: birthDate,
            age: age,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      });

      parser.on('error', function(err) {
        reject(err);
      });

      parser.on('end', function() {
        resolve(tempData);
      });

      Readable.from(file).pipe(parser);
    });
  });

  this.on('saveData', async (req) => {
    try {
      const data = req.data.data;
      await INSERT.into(Person).entries(data);
      tempData = [];
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  });

  this.on('cancelChanges', async () => {
    tempData = [];
    return true;
  });
});

function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
} 