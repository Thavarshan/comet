/* eslint-disable @typescript-eslint/no-var-requires */
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper');
const archiver = require('archiver');

const appxFilePath = path.resolve(__dirname, '../out/make/JeromeThayananthajothy.CometApp.appx');
const outputAppxPath = path.resolve(__dirname, '../out/make/JeromeThayananthajothy.CometApp-modified.appx');
const tempDir = path.resolve(__dirname, '../temp/appx');
const manifestFile = 'AppxManifest.xml';

const capabilitiesTag = `
  <Capabilities>
    <Capability Name="internetClient" />
    <Capability Name="privateNetworkClientServer" />
    <Capability Name="documentsLibrary" />
    <Capability Name="picturesLibrary" />
    <Capability Name="videosLibrary" />
    <Capability Name="broadFileSystemAccess" />
  </Capabilities>
`;

async function modifyManifest() {
  try {
    // Step 1: Unzip the .appx file
    await fs.mkdir(tempDir, { recursive: true });
    await fs
      .createReadStream(appxFilePath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .promise();

    // Step 2: Modify the AppxManifest.xml file
    const manifestPath = path.join(tempDir, manifestFile);
    let manifestContent = await fs.readFile(manifestPath, 'utf8');

    // Insert the necessary capabilities
    if (!manifestContent.includes('<Capabilities>')) {
      manifestContent = manifestContent.replace('</Application>', `${capabilitiesTag}</Application>`);
    }

    // Step 3: Save the modified manifest
    await fs.writeFile(manifestPath, manifestContent);

    // Step 4: Zip the files back into an .appx file
    const output = fs.createWriteStream(outputAppxPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function () {
      console.log(`${archive.pointer()} total bytes written`);
    });

    archive.on('error', function (err) {
      throw err;
    });

    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Cleanup temporary files
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('AppxManifest.xml modified successfully');
  } catch (err) {
    console.error('Error modifying AppxManifest.xml:', err);
  }
}

modifyManifest();

if (os.platform() !== 'win32') {
  exec('chmod +x node_modules/ffmpeg-static/ffmpeg', (err) => {
    if (err) {
      console.error('Failed to set executable permissions for ffmpeg:', err);
      process.exit(1);
    }
  });
}
