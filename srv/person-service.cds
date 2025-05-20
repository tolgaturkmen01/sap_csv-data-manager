using csv.data.manager as db from '../db/schema';

service PersonService {
  entity Person as projection on db.Person;
  
  action uploadCSV(file : Binary) returns array of Person;
  action saveData(data : array of Person) returns Boolean;
  action cancelChanges() returns Boolean;
} 