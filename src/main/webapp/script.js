// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

/**
 * Function which is called when page loads.
 * Add event listener to image upload button.
 * Put sample image on canvases on page.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const sampleImage = new ImageObject('images/sample-image.jpeg',
      await getImageFromUrl('images/sample-image.jpeg'),
      'sample-image.jpeg', 'image/jpeg', [
        {leftX: 87, topY: 405, height: 52, width: 50},
        {leftX: 599, topY: 365, height: 73, width: 72},
        {leftX: 460, topY: 329, height: 77, width: 76},
        {leftX: 254, topY: 456, height: 48, width: 47},
      ]);

  const uploadButton = document.getElementById('upload-image');
  uploadButton.addEventListener('change', handleImageUpload);

  // add sample image on page - original and blurred one.
  const inputCanvas = document.getElementById('input-canvas');
  drawImageOnCanvas(sampleImage.object, inputCanvas);

  processImage(sampleImage);
});

/**
 * Constructor for image object.
 * @param {String} imageUrl
 * @param {Image|HTMLCanvasElement}imageObject
 * @param {String} imageFileName
 * @param {String} imageType
 * @param {Array<Rect>} blurAreas
 * @constructor
 */
function ImageObject(imageUrl, imageObject, imageFileName,
    imageType, blurAreas) {
  this.url = imageUrl;
  this.object = imageObject;
  this.fileName = imageFileName;
  this.type = imageType;
  this.blurAreas = blurAreas;
}

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(async () => {
    freezePage();

    const imageFile = event.target.files[0];

    const image = await getImageObjectWithNoBlurAreas(imageFile);

    // put original image on page.
    const inputCanvas = document.getElementById('input-canvas');
    drawImageOnCanvas(image.object, inputCanvas);

    image.blurAreas = await getBlurAreas(imageFile);

    processImage(image);

    unfreezePage();
  }).catch((error) => {
    alert('ERROR: ' + error.message);
  });
}

/**
 * Function to get ImageObject from uploaded file
 * with blurAreas property set to empty.
 * @param {File} imageFile
 * @return {Promise<ImageObject>}
 */
async function getImageObjectWithNoBlurAreas(imageFile) {
  const imageUrl = URL.createObjectURL(imageFile);
  const imageObject = await getImageFromUrl(imageUrl);
  const imageType = getImageTypeOrError(imageFile);
  const fileName = imageFile.name;

  return new ImageObject(imageUrl, imageObject, fileName,
      imageType, []);
}

/**
 * Function to disable DOM elements and tell
 * the user that their image is being
 * processed.
 */
function freezePage() {
  const uploadButton = document.getElementById('upload-image');
  const downloadButton = document.getElementById('download-button');
  const outputCanvas = document.getElementById('output-canvas');

  downloadButton.classList.add('hide');
  downloadButton.disabled = true;
  uploadButton.disabled = true;

  outputCanvas.classList.add('hide');

  const loadingGif = document.createElement('img');
  loadingGif.src = 'images/loading.gif';
  loadingGif.id = 'loading-gif';
  outputCanvas.after(loadingGif);
}

/**
 * Function to enable DOM elements back from freezing.
 */
function unfreezePage() {
  const uploadButton = document.getElementById('upload-image');
  const downloadButton = document.getElementById('download-button');
  const outputCanvas = document.getElementById('output-canvas');

  downloadButton.classList.remove('hide');
  downloadButton.disabled = false;
  uploadButton.disabled = false;

  outputCanvas.classList.remove('hide');

  const loadingGif = document.getElementById('loading-gif');
  loadingGif.remove();
}

/**
 * Updates the page with new uploaded image.
 * It calls blurring method, puts new and blurred
 * images on canvases, updates blurRadius input
 * bar for new image and download button for
 * every new blurred image.
 * @param {ImageObject} image
 */
async function processImage(image) {
  const outputCanvas = document.getElementById('output-canvas');

  updateBlurRadiusInputBar(image);

  const blurRadiusInput = document.getElementById('blurring-radius');

  // draw blurred image on page.
  const blurredImage = getImageWithBlurredAreas(
      image, blurRadiusInput.value);
  drawImageOnCanvas(blurredImage.object, outputCanvas);

  updateDownloadButton(blurredImage);
}

/**
 * Function to update download button to download new image.
 * @param {ImageObject} image Image that we are making a
 * download button for.
 */
function updateDownloadButton(image) {
  const downloadButton = document.getElementById('download-button');

  downloadButton.href = image.url;

  // the name of the file which will be downloaded.
  downloadButton.download = image.fileName;
}

/**
 * Function to update blur radius input bar for new image.
 * Sets max and default values to the bar, adds event
 * listener to reblur the image when the bar is scrolled.
 * We get the formula for default value from experiments and
 * set max value to defaultValue * 2.
 * We decided that the best blurRadius value
 * depends mostly on the size of the area that we want to blur,
 * which is why we have some sample area and adjust the best
 * blur radius for it (which we get by experiments) to our
 * image's blurAreas sizes.
 * @param {ImageObject} image
 */
function updateBlurRadiusInputBar(image) {
  const DEFAULT_VALUE = getDefaultBlurRadius(image.blurAreas);

  const blurRadiusInput = document.getElementById('blurring-radius');

  blurRadiusInput.max = DEFAULT_VALUE * 2;
  blurRadiusInput.value = DEFAULT_VALUE;

  const outputCanvas = document.getElementById('output-canvas');

  // reblur image every time user scrolls the blurRadiusInput bar.
  blurRadiusInput.onchange = (event) => {
    const blurredImage = getImageWithBlurredAreas(
        image, event.target.value);
    drawImageOnCanvas(blurredImage.object, outputCanvas);

    updateDownloadButton(blurredImage);
  };
}
