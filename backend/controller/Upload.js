const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const response = require("./Response");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const FOLDERS = ["menu", "menu-item", "company", "staff"];
const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, done) => {
    const folder = FOLDERS.includes(req.query.folder) ? req.query.folder : "general";
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });
    req.uploadFolder = folder;
    done(null, dir);
  },
  filename: (req, file, done) => {
    const ext = IMAGE_TYPES[file.mimetype];
    done(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, done) => {
    if (Object.hasOwn(IMAGE_TYPES, file.mimetype)) return done(null, true);
    return done(Object.assign(new Error("Only JPG, PNG, WEBP or GIF images are allowed!"), { status: 422 }));
  },
}).single("file");

class Upload {
  image(req, res) {
    imageUpload(req, res, (error) => {
      if (error) {
        const message =
          error.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller!" : error.message;
        return response.error(res, message, error.status ?? 422);
      }

      if (!req.file) {
        return response.error(res, "Select an image to upload!", 422);
      }

      const url = `${req.protocol}://${req.get("host")}/uploads/${req.uploadFolder}/${req.file.filename}`;

      return response.insertionSuccess(
        res,
        { url, name: req.file.originalname, size: req.file.size },
        "Image Uploaded Successfully",
      );
    });
  }
}

const upload = new Upload();
module.exports = { upload, UPLOAD_ROOT };
