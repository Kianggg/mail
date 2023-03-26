const BODY_PREVIEW_LENGTH = 32;

document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Button used to send an email
  document.querySelector('#send-email').addEventListener('click', send_email);

  // Button used to reply to an email
  document.querySelector('#reply-email').addEventListener('click', () => reply_email(document.querySelector('#reply-email').value));

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#view-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#view-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Show a list of emails of the appropriate kind
  if ((mailbox == 'inbox') || (mailbox == 'sent') || (mailbox == 'archive')) {
    fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      emails.forEach(list_email);
    });
  }
  else {
    fetch('/emails/inbox')
    .then(response => response.json())
    .then(emails => {
      emails.forEach(list_email);
    });
  }
}

// Creates an email object and adds it to the page
function list_email(mail) {
  let email = document.createElement('div');

  // Designate it as an email (for css purposes) and set the background color appropriately
  email.setAttribute("id", "email");
  if (mail.read == true) {
    email.setAttribute("class", "read");
  }
  else {
    email.setAttribute("class", "unread");
  }

  // Note to future me: This is where you mess with the information on an email and what order it appears in
  let text = '';
  text += mail.sender + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
  text += mail.subject + ":&nbsp;";
  text += mail.body.substring(0, BODY_PREVIEW_LENGTH);
  if (mail.body.length > BODY_PREVIEW_LENGTH) {
    text += "...";
  }

  // Timestamp is formatted "Jan 1 2020, 12:00 AM", so substring (0, 5) will get just the dayy
  // Will include a terminal space if the day is a single digit
  let date_sent = mail.timestamp.substring(0, 6);

  // Display the email preview
  email.innerHTML = `<div id='emailHeader'>${text}</div><div id='emailDate'">${date_sent}</div>`;

  // Function that displays the email when it is clicked
  email.addEventListener('click', function() {

      // Show the email and hide everything else
      document.querySelector('#emails-view').style.display = 'none';
      document.querySelector('#compose-view').style.display = 'none';
      document.querySelector('#view-view').style.display = 'block';

      // Load content from email JSON onto the page
      document.querySelector('#view-sender').value = mail.sender;
      document.querySelector('#view-recipients').value = mail.recipients;
      document.querySelector('#view-subject').value = mail.subject;
      document.querySelector('#view-body').value = mail.body;
      document.querySelector('#reply-email').value = mail.id;

      // Set this email as having been read
      fetch(`/emails/${mail.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      });
  });

  // Adds the email to the list so that it can be displayed
  document.querySelector('#emails-view').append(email);

  // Creates an archive toggle button, but only on the Inbox and Archived boxes
  if ((document.querySelector('h3').innerHTML == 'Inbox') || (document.querySelector('h3').innerHTML == 'Archive')) {
    let archive_button = document.createElement('div');
    archive_button.setAttribute("id", "archiveButton");

    // Set correct text
    if (document.querySelector('h3').innerHTML == 'Inbox') {
      archive_button.innerHTML = "<strong>Archive</strong>";
    }
    else {
      archive_button.innerHTML = "<strong>Unarchive</strong>";
    }

    // When the archive button is clicked, toggle the email's archive status, then (re)load the inbox
    archive_button.addEventListener('click', () => archive_toggle(mail.id));

    // Adds the archive button to the email view
    document.querySelector('#emails-view').append(archive_button);
  }
}

// Briefly checks for errors, then sends the user a notification when their email has been sent successfully
// Doe snot reload the inbox until the message has successfully been sent
function send_email() {
  // Gather info from the form
  let recipient_list = document.querySelector('#compose-recipients').value;
  let subject_line = document.querySelector('#compose-subject').value;
  let body_text = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipient_list,
        subject: subject_line,
        body: body_text
    })
  })
  .then(response => response.json())
  .then(result => {
      if (result.error) {
        create_alert('error', result.error);
      }
      else {
        create_alert('success', result.message);
        load_mailbox('inbox');
      }
  });
}

// This does the same thing as "compose_email()", except it pre-fills the recipient, subject, and body fields
function reply_email(email_id) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#view-view').style.display = 'none';

  // Fetch data from the email that is being replied to
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {
      // Pre-fill the composition fields
      document.querySelector('#compose-recipients').value = email.sender;

      if (email.subject.substring(0, 3) == "Re:") {
        document.querySelector('#compose-subject').value = email.subject;
      }
      else {
        document.querySelector('#compose-subject').value = "Re: " + email.subject;
      }

      document.querySelector('#compose-body').value = 'On ' + email.timestamp + " " + email.sender + " wrote:     " + email.body;
  });
}

// Archives or unarchives an email
// (Re)loads the inbox when finished
function archive_toggle(email_id) {
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {
    if (email.archived == true) {
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: false
        })
      });
    }
    else {
      fetch(`/emails/${email_id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: true
        })
      });
    }
  })
  .then(load_mailbox('inbox'));
}

// Sends a notification to the top of the screen that fades after 7 seconds
// Type must be 'success' or 'error'
function create_alert(type, message) {
  let alert = document.createElement('div');
  alert.setAttribute("id", "announcement");
  alert.setAttribute("class", type);
  alert.innerHTML = `<h3>${message}</h3>`;
  document.querySelector(".container").prepend(alert);
}