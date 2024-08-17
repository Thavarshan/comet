const { exec } = require("child_process");
const os = require("os");

if (os.platform() !== "win32") {
  exec("chmod +x node_modules/ffmpeg-static/ffmpeg", (err) => {
    if (err) {
      console.error("Failed to set executable permissions for ffmpeg:", err);
      process.exit(1);
    }
  });
}
