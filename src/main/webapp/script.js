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
document.addEventListener('DOMContentLoaded', () => {
  const SAMPLE_IMAGE_URL = 'images/sample-image.jpeg';
  const SAMPLE_IMAGE_NAME = 'sample-image.jpeg';
  const SAMPLE_IMAGE_TYPE = 'image/jpeg';
  const SAMPLE_IMAGE_BLUR_AREAS = [
    {leftX: 87, topY: 405, height: 52, width: 50},
    {leftX: 599, topY: 365, height: 73, width: 72},
    {leftX: 460, topY: 329, height: 77, width: 76},
    {leftX: 254, topY: 456, height: 48, width: 47},
  ];

  const uploadButton = document.getElementById('upload-image');
  uploadButton.addEventListener('change', handleImageUpload);

  // add sample image on page - original and blurred one.
  processImage(SAMPLE_IMAGE_URL, SAMPLE_IMAGE_BLUR_AREAS,
      SAMPLE_IMAGE_TYPE, SAMPLE_IMAGE_NAME);
});

/**
 * Function which is called when user chooses file to upload.
 * @param {Event} event "Change" event on image upload button.
 */
async function handleImageUpload(event) {
  await validateImageUpload().then(async () => {
    // blur the image and update html page.
    const imageUrl = URL.createObjectURL(event.target.files[0]);

    const blurAreas = await getBlurAreas(event.target.files[0]);

    const imageType = getImageTypeOrError(event.target.files[0]);

    const fileName = event.target.files[0].name;

    processImage(imageUrl, blurAreas, imageType, fileName);
  }).catch((error) => {
    alert('ERROR: ' + error.message);
  });
}

/**
 * Updates the page with new uploaded image.
 * It calls blurring method, puts new and blurred
 * images on canvases, updates blurRadius input
 * bar for new image and download button for
 * every new blurred image.
 * @param {String} imageUrl
 * @param {Array<Rect>} blurAreas
 * @param {String} imageType
 * @param {String} imageFileName Name of an uploaded image file.
 */
async function processImage(imageUrl, blurAreas, imageType, imageFileName) {
  const imageObj = await getImageFromUrl(imageUrl);

  const inputCanvas = document.getElementById('input-canvas');
  const outputCanvas = document.getElementById('output-canvas');

  updateBlurRadiusInputBar(blurAreas, imageObj, imageType, imageFileName);

  const blurRadiusInput = document.getElementById('blurring-radius');

  // draw original and blurred images on page.
  drawImageOnCanvas(imageObj, inputCanvas);

  const blurredImage = getImageWithBlurredAreas(
      blurAreas, imageObj, blurRadiusInput.value);
  drawImageOnCanvas(blurredImage, outputCanvas);

  updateDownloadButton(blurredImage, imageType, imageFileName);
}

/**
 * Function to update download button to download new image.
 * @param {HTMLCanvasElement} image Canvas with an image
 * that we make a download button for.
 * @param {String} imageType Type of an image we want to
 * download.
 * @param {String} imageFileName The name of an uploaded image file.
 * The name of a downloaded file will contain it.
 */
function updateDownloadButton(image, imageType = 'image/png',
    imageFileName= 'image.png') {
  const downloadButton = document.getElementById('download-button');

  const imageUrl = image.toDataURL(imageType);

  downloadButton.href = imageUrl;

  // the name of the file which will be downloaded.
  downloadButton.download = 'blurred-' + imageFileName;
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
 * @param {Array<Rect>} blurAreas
 * @param {Image} imageObj
 * @param {String} imageType
 * @param {String} imageFileName Name of an uploaded image file.
 */
function updateBlurRadiusInputBar(blurAreas, imageObj,
    imageType, imageFileName) {
  const SAMPLE_AREA_SIZE = 100 * 100;
  const SAMPLE_BEST_BLUR_RADIUS = 12;

  const DEFAULT_VALUE = Math.ceil(getAverageRectsArea(blurAreas) /
      SAMPLE_AREA_SIZE * SAMPLE_BEST_BLUR_RADIUS);

  const blurRadiusInput = document.getElementById('blurring-radius');

  blurRadiusInput.max = DEFAULT_VALUE * 2;
  blurRadiusInput.value = DEFAULT_VALUE;

  const outputCanvas = document.getElementById('output-canvas');

  // reblur image every time user scrolls the blurRadiusInput bar.
  blurRadiusInput.onchange = (event) => {
    const blurredImage = getImageWithBlurredAreas(
        blurAreas, imageObj, event.target.value);
    drawImageOnCanvas(blurredImage, outputCanvas);

    updateDownloadButton(blurredImage, imageType, imageFileName);
  };
}

/**
 * Helper function to get average rect size of
 * rects to blur.
 * @param {Array<Rect>} rects
 * @return {Number} average rect size.
 */
function getAverageRectsArea(rects) {
  let totalArea = 0;

  for (const rect of rects) {
    totalArea += rect.width * rect.height;
  }

  return totalArea / rects.length;
}

/**
 * Helper function to get image object from url
 * pointing to that image.
 * @param {String} url
 * @return {Promise<Image>}
 */
function getImageFromUrl(url) {
  return new Promise(function(resolve) {
    const image = new Image();
    image.src = url;

    image.onload = function() {
      resolve(image);
    };
  });
}

/**
 * Function to draw image on canvas.
 * Width of canvas should be constant, height adjusts for
 * the image proportions.
 * @param {Image} image
 * @param {HTMLCanvasElement} canvas
 */
function drawImageOnCanvas(image, canvas) {
  const ctx = canvas.getContext('2d');

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // resize canvas height to fit new image
  canvas.height = image.height;
  canvas.width = image.width;

  // draw new image on it
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}
