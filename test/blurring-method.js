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
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
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
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
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
        },
        {
          'leftX': 30,
          'topY': 30,
          'width': 200,
          'height': 300,
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
        },
        {
          'leftX': 100,
          'topY': 100,
          'width': 50,
          'height': 10,
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
        const rectsToBlur = testCase.rects;
        const inputImage = await getImageFromPath(testCase.inputImageUrl);
        const expectedImage = await getFileBlob(testCase.expectedImageUrl);
        const blurRadius = testCase.blurRadius;

        getImageWithBlurredAreas(rectsToBlur, inputImage, blurRadius).toBlob(
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
