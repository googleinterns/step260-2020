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

describe('image upload validation', function() {
  /**
   * Helper function to add file to the
   * input element on html page.
   * @param {File} file
   */
  function addFileToInputElement(file) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const imageUpload = document.getElementById('upload-image');
    imageUpload.files = dataTransfer.files;
  }

  // This function is used inside the validation function
  describe('#getImageTypeOrError()', function() {
    it('jpeg extension', async function() {
      const jpegImage = await getFileObject('test-files/90kb.jpeg');

      await getImageTypeOrError(jpegImage).then((extension) => {
        expect(extension).to.equal('image/jpeg');
      });
    });

    it('png extension', async function() {
      const pngImage = await getFileObject('test-files/537kb.png');

      await getImageTypeOrError(pngImage).then((extension) => {
        expect(extension).to.equal('image/png');
      });
    });

    it('not an image', async function() {
      const notImage = await getFileObject('test-files/not-image.txt');

      await getImageTypeOrError(notImage).catch((error) => {
        expect(() => {
          throw error;
        }).to.throw(
            'Invalid file type. Only jpeg and png images can be uploaded');
      });
    });

    // File objects in js have type property, but
    // it can be changed, our validation function can not be fooled so easily
    it('not an image but type is set to image', async function() {
      const notImage = new File([], 'file.jpeg', {
        type: 'image/jpeg',
      });

      await getImageTypeOrError(notImage).catch((error) => {
        expect(() => {
          throw error;
        }).to.throw(
            'Invalid file type. Only jpeg and png images can be uploaded');
      });
    });
  });

  describe('empty input', function() {
    it('no file selected', async function() {
      await validateImageUpload().catch((error) => {
        expect(() => {
          throw error;
        }).to.throw('Nothing is uploaded');
      });
    });
  });

  describe('too big resolution', function() {
    it('too big resolution, normal size', async function() {
      const IMAGE_WIDTH = 1999;
      const IMAGE_HEIGHT = 1203;
      const MX_WIDTH = 1920;
      const MX_HEIGHT = 1080;
      const image = await getFileObject('test-files/500kb_large_width.jpg');
      addFileToInputElement(image);

      await validateImageUpload().catch((error) => {
        expect(() => {
          throw error;
        }).to.throw(
            'The image resolution can not exceed ' + MX_WIDTH +
            'x' + MX_HEIGHT + 'px. ' +
            'The uploaded image resolution is ' +
            IMAGE_WIDTH + 'x' + IMAGE_HEIGHT + 'px');
      });
    });
  });

  // Max sizes for jpg and png images are different
  describe('too big size', function() {
    it('too big png image', async function() {
      const pngImage = await getFileObject('test-files/36mb_large_dim.png');
      addFileToInputElement(pngImage);

      await validateImageUpload().catch((error) => {
        expect(() => {
          throw error;
        }).to.throw(
            'File size should not exceed 8MB for image/png images.' +
            'The size of an uploaded image/png image is ' +
            Math.ceil(pngImage.size / 1024 / 1024) + 'MB');
      });
    });

    it('too big jpg image', async function() {
      const jpgImage = await getFileObject('test-files/6mb_large_dim.jpg');
      addFileToInputElement(jpgImage);

      await validateImageUpload().catch((error) => {
        expect(() => {
          throw error;
        }).to.throw(
            'File size should not exceed 2MB for image/jpeg images.' +
            'The size of an uploaded image/jpeg image is ' +
            Math.ceil(jpgImage.size / 1024 / 1024) + 'MB');
      });
    });
  });

  describe('valid image', function() {
    it('valid image', async function() {
      const image = await getFileObject('test-files/64kb.jpg');
      addFileToInputElement(image);

      await validateImageUpload().then((result) => {
        expect(result).to.equal(undefined);
      });
    });
  });
});
