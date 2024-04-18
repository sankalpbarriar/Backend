import multer from "multer";

// temperoraily storing the uploaded file on the disk using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //loacation where we want to put the files temperoraly in our local
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});
