const list = document.querySelector('#notes-list');
const container = document.querySelector('.container');
const form = document.querySelector('#notes-form');
const alert = document.querySelector('.alert');
const titleInput = document.querySelector('#title');
const textInput = document.querySelector('#text');
const notesList = document.querySelector('#notes-list');
 
let db;

// Note Class: represents a note
class Note {
  constructor(title, text) {
    this.title = title;
    this.text = text;
  }
}

class UI {
  static displayNotes() {
    // Clearing the whole existing list to display the updated store
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    // Open our object store and then get a cursor - which iterates through all the
    // different data items in the store
    let objectStore = db.transaction('notes').objectStore('notes');
    objectStore.openCursor().onsuccess = function(e) {
      // Get a reference to the cursor
      let cursor = e.target.result;

      if (cursor) {
        const title = cursor.value.title;
        const text = cursor.value.text;
        const nodeId = cursor.value.id;

        const note = new Note(title, text);
        UI.addNoteToList(note, nodeId);

        // Iterate to the next item in the cursor
        cursor.continue();
      }
    };
  }

  static addNoteToList(note, nodeId) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${note.title}</td>
      <td>${note.text}</td>
      <td><a href="#" class="btn btn-danger btn-sm delete">X</a></td>
    `;
    row.setAttribute('note-id', nodeId);

    list.appendChild(row);
  }

  static clearFormFields() {
    titleInput.value = '';
    textInput.value = '';
  }

  static showAlert(message, className) {
    const div = document.createElement('div');
    div.className = `alert alert-${className}`;
    div.appendChild(document.createTextNode(message));
    container.insertBefore(div, form);

    // Vanish in 3 seconds
    setTimeout(() => alert.remove(), 3000);
  }
}

// Database handler
class Dbh {
  static open() {
    return new Promise((resolve, reject) => {
      // Open the database (if it doesn't exist, creates one with onupfradeneeded)
      // asynchronous operation, needs to be handled
      let request = window.indexedDB.open('notes', 1);

      request.onerror = function() {
        reject('Database failed to open');
      };

      request.onsuccess = function() {
        // if opened successfully, an object representing the opened database becomes available in request.result
        db = request.result;
        resolve();
      }

      // Setup the database tables if this has not already been done
      request.onupgradeneeded = function(e) {
        // Grab a reference to the opened database
        let db = e.target.result;

        // Create an objectStore to store our notes in (basically like a single table)
        // including a auto-incrementing key
        let objectStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement:true });

        // Define what data items the objectStore will contain
        objectStore.createIndex('title', 'title', { unique: false });
        objectStore.createIndex('text', 'text', { unique: false });
      };
    });
  }
}

class NotesStore {
  static addNote(note) {
    return new Promise((resolve, reject) => {
      // open a read/write db transaction, ready for adding the data
      let transaction = db.transaction(['notes'], 'readwrite');

      // call an object store that's already been added to the database
      let objectStore = transaction.objectStore('notes');

      // this is asynchronous!!
      objectStore.add(note);

      // Resolves/rejects once transaction is over
      transaction.oncomplete = resolve;
      transaction.onerror = function() {
        reject('Transaction not opened due to error');
      };
    });
  }

  static deleteNote(noteId) {
    return new Promise((resolve, reject) => {
      // open a database transaction and delete the task, finding it using the id we retrieved above
      let transaction = db.transaction(['notes'], 'readwrite');
      let objectStore = transaction.objectStore('notes');

      // this is asynchronous!!
      objectStore.delete(noteId);

      // Resolves/rejects once transaction is over
      transaction.oncomplete = resolve;
      transaction.onerror = function() {
        reject('Transaction not opened due to error');
      };
    });
  }
}

function init() {
  Dbh.open().then(UI.displayNotes)
    .catch((err) => console.error(err));
}

function handleAddNote(e) {
  // Prevent default submit
  e.preventDefault();

  // Get form values
  const titleValue = titleInput.value;
  const textValue = textInput.value;

  // Validation
  if (!titleValue || !textValue) {
    return UI.showAlert('Please fill all the fields', 'danger');
  }

  const note = new Note(titleValue, textValue);

  // Add new note to store then display updated store content
  NotesStore.addNote(note)
    .then(UI.clearFormFields)
    .then(UI.displayNotes)
    .catch((err) => console.error(err));
}

function handleDeleteNote(e) {
  // Get the note Id
  const noteId = Number(e.target.parentNode.parentNode.getAttribute('note-id'));

  // Delete note from store then display updated store content
  NotesStore.deleteNote(noteId)
    .then(UI.displayNotes)
    .catch((err) => console.error(err));
}

// On Content Loaded
document.addEventListener('DOMContentLoaded', init);

// On new note submitted
form.onsubmit = handleAddNote;

// On note deleted in notes list
notesList.addEventListener('click', handleDeleteNote);