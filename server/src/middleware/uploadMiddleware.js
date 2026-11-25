
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const FileType = require('file-type');

const uploadDirectory = path.join(
  __dirname,
  '../../uploads/products'
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedTypes = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/avif': ['avif']
};

function uploadError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname)
      .toLowerCase()
      .replace('.', '');

    if (!req.uploadedProductFiles) {
      req.uploadedProductFiles = [];
    }

    const filename = `${crypto.randomUUID()}.${extension}`;

    req.uploadedProductFiles.push(
      path.join(uploadDirectory, filename)
    );

    callback(null, filename);
  }
});

const multerUpload = multer({
  storage,

  fileFilter: (req, file, callback) => {
    if (!Object.keys(allowedTypes).includes(file.mimetype)) {
      return callback(
        uploadError(
          'Only JPEG, PNG, WebP and AVIF images are allowed.'
        )
      );
    }

    callback(null, true);
  },

  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024,
    fields: 30,
    parts: 40
  }
}).array('images', 8);

async function removeUploadedFiles(req) {
  const files = req.uploadedProductFiles || [];

  await Promise.all(
    files.map(async filePath => {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Upload cleanup error:', error);
        }
      }
    })
  );
}

async function validateUploadedImages(req) {
  const files = req.files || [];

  for (const file of files) {
    const detected = await FileType.fromFile(file.path);

    if (!detected || !allowedTypes[detected.mime]) {
      throw uploadError(
        'An uploaded file is not a supported image.'
      );
    }

    if (file.mimetype !== detected.mime) {
      throw uploadError(
        'Image content does not match its declared file type.'
      );
    }

    const originalExtension = path.extname(
      file.originalname
    ).toLowerCase().replace('.', '');

    if (!allowedTypes[detected.mime].includes(originalExtension)) {
      throw uploadError(
        'Image extension does not match its actual file type.'
      );
    }
  }
}

function uploadProductImages(req, res, next) {
  multerUpload(req, res, async error => {
    if (error) {
      await removeUploadedFiles(req);
      return next(error);
    }

    try {
      await validateUploadedImages(req);
      next();
    } catch (validationError) {
      await removeUploadedFiles(req);
      next(validationError);
    }
  });
}

module.exports = uploadProductImages;
