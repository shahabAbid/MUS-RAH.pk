
const db = require('./src/database/db');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      reject(new Error('Please run this script in a terminal.'));
      return;
    }

    process.stdout.write(question);
    let password = '';

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function onData(char) {
      if (char === '\u0003') {
        stdin.setRawMode(false);
        stdin.removeListener('data', onData);
        reject(new Error('Cancelled.'));
        return;
      }

      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0008' || char === '\u007f') {
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    }

    stdin.on('data', onData);
  });
}

async function main() {
  try {
    const email = 'testadmin@gmail.com';
    const fullName = await ask('Admin full name: ');
    const password = await askHidden('Enter a new admin password (hidden): ');

    if (!fullName.trim()) {
      throw new Error('Name cannot be empty.');
    }

    if (password.length < 8 || password.length > 72) {
      throw new Error('Password must be between 8 and 72 characters.');
    }

    const existingUser = db.prepare(
      'SELECT id, role FROM users WHERE email = ?'
    ).get(email);

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('An admin account with this email already exists.');
      } else {
        console.log('This email already belongs to a non-admin account. No changes were made.');
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run(fullName.trim(), email, passwordHash);

    console.log('\nAdmin account created successfully!');
    console.log('Email:', email);
    console.log('Role: admin');
  } finally {
    rl.close();
    db.close();
  }
}

main().catch(error => {
  console.error('\nError:', error.message);
  rl.close();
  db.close();
  process.exitCode = 1;
});
