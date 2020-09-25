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

describe('blurring method', function() {
  const testCases = [
    {
      'description': 'jpg image',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'blurred/test1.png',
      'blurRadius': 10,
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
          'toBeBlurred': true,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
          'toBeBlurred': true,
        },
      ],
    },
    {
      'description': 'png image',
      'inputImageUrl': 'test-files/537kb.png',
      'expectedImageUrl': 'blurred/test2.png',
      'blurRadius': 10,
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
          'toBeBlurred': true,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
          'toBeBlurred': true,
        },
      ],
    },
    {
      'description': 'intersecting rectangles',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'blurred/test3.png',
      'blurRadius': 10,
      'rects': [
        {
          'leftX': 100,
          'topY': 100,
          'width': 400,
          'height': 100,
          'toBeBlurred': true,
        },
        {
          'leftX': 30,
          'topY': 30,
          'width': 200,
          'height': 300,
          'toBeBlurred': true,
        },
      ],
    },
    {
      'description': 'one big rectangle',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'blurred/test4.png',
      'blurRadius': 15,
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 615,
          'height': 370,
          'toBeBlurred': true,
        },
      ],
    },
    {
      'description': 'no blur',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'blurred/test5.png',
      'blurRadius': 0,
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
          'toBeBlurred': true,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
          'toBeBlurred': true,
        },
      ],
    },
    {
      'description': 'one rect not blurred',
      'inputImageUrl': 'test-files/64kb.jpg',
      'expectedImageUrl': 'blurred/test6.png',
      'blurRadius': 10,
      'rects': [
        {
          'leftX': 0,
          'topY': 0,
          'width': 100,
          'height': 100,
          'toBeBlurred': true,
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
          'toBeBlurred': false,
        },
      ],
    },
  ];

  /**
   * Function to generate tests from test cases above.
   * @param {Object} testCase
   */
  function makeTest(testCase) {
    it(testCase.description, function() {
      return new Promise(async function(resolve, reject) {
        const inputImage = new ImageObject(testCase.inputImageUrl,
            await getImageFromPath(testCase.inputImageUrl), 'somename',
            'sometype', testCase.rects);
        const expectedImage = await getFileBlob(testCase.expectedImageUrl);
        const blurRadius = testCase.blurRadius;

        getImageWithBlurredAreas(inputImage, blurRadius).object.toBlob(
            async function(blurredImage) {
              resemble(expectedImage)
                  .compareTo(blurredImage)
                  .onComplete(function(data) {
                    // expected and blurred images must be 100% equal.
                    expect((parseInt(data.misMatchPercentage))).to.equal(0);
                    resolve();
                  });
            });
      });
    });
  }

  for (const testCase of testCases) {
    makeTest(testCase);
  }
});
