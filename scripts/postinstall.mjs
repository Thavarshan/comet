import os from 'os';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import archiver from 'archiver';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
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
    await fsPromises.mkdir(tempDir, { recursive: true });
    await new Promise((resolve, reject) => {
      fs.createReadStream(appxFilePath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    // Step 2: Modify the AppxManifest.xml file
    const manifestPath = path.join(tempDir, manifestFile);
    let manifestContent = await fsPromises.readFile(manifestPath, 'utf8');

    // Insert the necessary capabilities
    if (!manifestContent.includes('<Capabilities>')) {
      manifestContent = manifestContent.replace('</Application>', `${capabilitiesTag}</Application>`);
    }

    // Step 3: Save the modified manifest
    await fsPromises.writeFile(manifestPath, manifestContent);

    // Step 4: Zip the files back into an .appx file
    const output = fs.createWriteStream(outputAppxPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes written`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Cleanup temporary files
    await fsPromises.rm(tempDir, { recursive: true, force: true });

    console.log('AppxManifest.xml modified successfully');
  } catch (err) {
    console.error('Error modifying AppxManifest.xml:', err);
  }
}

if (os.platform() === 'win32') {
  modifyManifest();
}
