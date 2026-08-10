const Jimp = require('jimp');

async function padImage() {
  try {
    const image = await Jimp.read('assets/images/android-icon-foreground.png');
    // Adaptive icon size should be 1080x1080.
    // The safe zone is a circle of diameter 720 (66% of 1080).
    // Let's scale the original logo to fit nicely within 600x600.
    const canvas = new Jimp(1080, 1080, 0x00000000); // transparent background
    
    image.scaleToFit(600, 600);
    
    const x = Math.floor((1080 - image.bitmap.width) / 2);
    const y = Math.floor((1080 - image.bitmap.height) / 2);
    
    canvas.composite(image, x, y);
    await canvas.writeAsync('assets/images/android-icon-foreground-padded.png');
    console.log('Successfully padded android-icon-foreground.png');
  } catch (err) {
    console.error('Error padding image:', err);
  }
}

padImage();
