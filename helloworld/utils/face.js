

var model_data = require('data.js');


function average(frame) {
  const uint8view = new Uint8Array(frame.data)
  console.log(frame.data instanceof ArrayBuffer, frame.width, frame.height, uint8view[0], uint8view[1], uint8view[2], uint8view[3])
  //console.log(uint8view[0],uint8view[1],uint8view[2])

  var sum = 0.0
  for (var i = 0; i < frame.width * frame.height; i++) {
    sum += uint8view[i]
  }
  return sum / frame.width / frame.height;
}

function print_img(frame) {
  const uint8view = new Uint8Array(frame.data)

  var p1 = uint8view[0]
  var p2 = uint8view[960 * 4 - 4]
  var p3 = uint8view[719 * 960 * 4]
  var p4 = uint8view[720 * 960 * 4 - 4]

  return [p1,p2,p3,p4];
}


function horizontalConvolve(pixels, width, height, weightsVector, opaque) {
  var side = weightsVector.length;
  var halfSide = Math.floor(side / 2);
  var output = new Float32Array(width * height * 4);
  var alphaFac = opaque ? 1 : 0;

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var sy = y;
      var sx = x;
      var offset = (y * width + x) * 4;
      var r = 0;
      var g = 0;
      var b = 0;
      var a = 0;
      for (var cx = 0; cx < side; cx++) {
        var scy = sy;
        var scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
        var poffset = (scy * width + scx) * 4;
        var wt = weightsVector[cx];
        r += pixels[poffset] * wt;
        g += pixels[poffset + 1] * wt;
        b += pixels[poffset + 2] * wt;
        a += pixels[poffset + 3] * wt;
      }
      output[offset] = r;
      output[offset + 1] = g;
      output[offset + 2] = b;
      output[offset + 3] = a + alphaFac * (255 - a);
    }
  }
  return output;
}

function verticalConvolve(pixels, width, height, weightsVector, opaque) {
  var side = weightsVector.length;
  var halfSide = Math.floor(side / 2);
  var output = new Float32Array(width * height * 4);
  var alphaFac = opaque ? 1 : 0;

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var sy = y;
      var sx = x;
      var offset = (y * width + x) * 4;
      var r = 0;
      var g = 0;
      var b = 0;
      var a = 0;
      for (var cy = 0; cy < side; cy++) {
        var scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
        var scx = sx;
        var poffset = (scy * width + scx) * 4;
        var wt = weightsVector[cy];
        r += pixels[poffset] * wt;
        g += pixels[poffset + 1] * wt;
        b += pixels[poffset + 2] * wt;
        a += pixels[poffset + 3] * wt;
      }
      output[offset] = r;
      output[offset + 1] = g;
      output[offset + 2] = b;
      output[offset + 3] = a + alphaFac * (255 - a);
    }
  }
  return output;
}

function separableConvolve(pixels, width, height, horizWeights, vertWeights, opaque) {
  var vertical = verticalConvolve(pixels, width, height, vertWeights, opaque);
  return horizontalConvolve(vertical, width, height, horizWeights, opaque);
}

function grayscale(pixels, width, height, fillRGBA) {
  var gray = new Uint8ClampedArray(fillRGBA ? pixels.length : pixels.length >> 2);
  var p = 0;
  var w = 0;
  for (var i = 0; i < height; i++) {
    for (var j = 0; j < width; j++) {
      var value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
      gray[p++] = value;

      if (fillRGBA) {
        gray[p++] = value;
        gray[p++] = value;
        gray[p++] = pixels[w + 3];
      }

      w += 4;
    }
  }
  return gray;
};

function sobel(pixels, width, height) {
  pixels = grayscale(pixels, width, height, true);
  var output = new Float32Array(width * height * 4);
  var sobelSignVector = new Float32Array([-1, 0, 1]);
  var sobelScaleVector = new Float32Array([1, 2, 1]);
  var vertical = separableConvolve(pixels, width, height, sobelSignVector, sobelScaleVector);
  var horizontal = separableConvolve(pixels, width, height, sobelScaleVector, sobelSignVector);

  for (var i = 0; i < output.length; i += 4) {
    var v = vertical[i];
    var h = horizontal[i];
    var p = Math.sqrt(h * h + v * v);
    output[i] = p;
    output[i + 1] = p;
    output[i + 2] = p;
    output[i + 3] = 255;
  }

  return output;
}

function computePixelValueSAT_(SAT, width, i, j, pixel) {
  var w = i * width + j;
  SAT[w] = (SAT[w - width] || 0) + (SAT[w - 1] || 0) + pixel - (SAT[w - width - 1] || 0);
}

function computePixelValueRSAT_(RSAT, width, i, j, pixel, pixelAbove) {
  var w = i * width + j;
  RSAT[w] = (RSAT[w - width - 1] || 0) + (RSAT[w - width + 1] || 0) - (RSAT[w - width - width] || 0) + pixel + pixelAbove;
}

function computeIntegralImage(pixels, width, height, opt_integralImage, opt_integralImageSquare, opt_tiltedIntegralImage, opt_integralImageSobel) {
  if (arguments.length < 4) {
    throw new Error('You should specify at least one output array in the order: sum, square, tilted, sobel.');
  }
  var pixelsSobel;
  if (opt_integralImageSobel) {
    pixelsSobel = sobel(pixels, width, height);
  }
  for (var i = 0; i < height; i++) {
    for (var j = 0; j < width; j++) {
      var w = i * width * 4 + j * 4;
      var pixel = ~~(pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114);
      if (opt_integralImage) {
        computePixelValueSAT_(opt_integralImage, width, i, j, pixel);
      }
      if (opt_integralImageSquare) {
        computePixelValueSAT_(opt_integralImageSquare, width, i, j, pixel * pixel);
      }
      if (opt_tiltedIntegralImage) {
        var w1 = w - width * 4;
        var pixelAbove = ~~(pixels[w1] * 0.299 + pixels[w1 + 1] * 0.587 + pixels[w1 + 2] * 0.114);
        computePixelValueRSAT_(opt_tiltedIntegralImage, width, i, j, pixel, pixelAbove || 0);
      }
      if (opt_integralImageSobel) {
        computePixelValueSAT_(opt_integralImageSobel, width, i, j, pixelsSobel[w]);
      }
    }
  }
}

function isTriviallyExcluded(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight) {
  var wbA = i * width + j;
  var wbB = wbA + blockWidth;
  var wbD = wbA + blockHeight * width;
  var wbC = wbD + blockWidth;
  var blockEdgesDensity = (integralImageSobel[wbA] - integralImageSobel[wbB] - integralImageSobel[wbD] + integralImageSobel[wbC]) / (blockWidth * blockHeight * 255);
  if (blockEdgesDensity < edgesDensity) {
    return true;
  }
  return false;
}

function evalStages_(data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale) {
  var inverseArea = 1.0 / (blockWidth * blockHeight);
  var wbA = i * width + j;
  var wbB = wbA + blockWidth;
  var wbD = wbA + blockHeight * width;
  var wbC = wbD + blockWidth;
  var mean = (integralImage[wbA] - integralImage[wbB] - integralImage[wbD] + integralImage[wbC]) * inverseArea;
  var variance = (integralImageSquare[wbA] - integralImageSquare[wbB] - integralImageSquare[wbD] + integralImageSquare[wbC]) * inverseArea - mean * mean;

  var standardDeviation = 1;
  if (variance > 0) {
    standardDeviation = Math.sqrt(variance);
  }

  var length = data.length;

  for (var w = 2; w < length; ) {
    var stageSum = 0;
    var stageThreshold = data[w++];
    var nodeLength = data[w++];

    while (nodeLength--) {
      var rectsSum = 0;
      var tilted = data[w++];
      var rectsLength = data[w++];

      for (var r = 0; r < rectsLength; r++) {
        var rectLeft = (j + data[w++] * scale + 0.5) | 0;
        var rectTop = (i + data[w++] * scale + 0.5) | 0;
        var rectWidth = (data[w++] * scale + 0.5) | 0;
        var rectHeight = (data[w++] * scale + 0.5) | 0;
        var rectWeight = data[w++];

        var w1;
        var w2;
        var w3;
        var w4;
        if (tilted) {
          // RectSum(r) = RSAT(x-h+w, y+w+h-1) + RSAT(x, y-1) - RSAT(x-h, y+h-1) - RSAT(x+w, y+w-1)
          w1 = (rectLeft - rectHeight + rectWidth) + (rectTop + rectWidth + rectHeight - 1) * width;
          w2 = rectLeft + (rectTop - 1) * width;
          w3 = (rectLeft - rectHeight) + (rectTop + rectHeight - 1) * width;
          w4 = (rectLeft + rectWidth) + (rectTop + rectWidth - 1) * width;
          rectsSum += (tiltedIntegralImage[w1] + tiltedIntegralImage[w2] - tiltedIntegralImage[w3] - tiltedIntegralImage[w4]) * rectWeight;
        } else {
          // RectSum(r) = SAT(x-1, y-1) + SAT(x+w-1, y+h-1) - SAT(x-1, y+h-1) - SAT(x+w-1, y-1)
          w1 = rectTop * width + rectLeft;
          w2 = w1 + rectWidth;
          w3 = w1 + rectHeight * width;
          w4 = w3 + rectWidth;
          rectsSum += (integralImage[w1] - integralImage[w2] - integralImage[w3] + integralImage[w4]) * rectWeight;
          // TODO: Review the code below to analyze performance when using it instead.
          // w1 = (rectLeft - 1) + (rectTop - 1) * width;
          // w2 = (rectLeft + rectWidth - 1) + (rectTop + rectHeight - 1) * width;
          // w3 = (rectLeft - 1) + (rectTop + rectHeight - 1) * width;
          // w4 = (rectLeft + rectWidth - 1) + (rectTop - 1) * width;
          // rectsSum += (integralImage[w1] + integralImage[w2] - integralImage[w3] - integralImage[w4]) * rectWeight;
        }
      }

      var nodeThreshold = data[w++];
      var nodeLeft = data[w++];
      var nodeRight = data[w++];

      if (rectsSum * inverseArea < nodeThreshold * standardDeviation) {
        stageSum += nodeLeft;
      } else {
        stageSum += nodeRight;
      }
    }

    if (stageSum < stageThreshold) {
      return false;
    }
  }
  return true;
}

//DisjointSet class
function DisjointSet(length) {
  if (length === undefined) {
    throw new Error('DisjointSet length not specified.');
  }
  this.length = length;
  this.parent = new Uint32Array(length);
  for (var i = 0; i < length; i++) {
    this.parent[i] = i;
  }
};
DisjointSet.prototype.length = null;
DisjointSet.prototype.parent = null;
DisjointSet.prototype.find = function(i) {
  if (this.parent[i] === i) {
    return i;
  } else {
    return (this.parent[i] = this.find(this.parent[i]));
  }
};
DisjointSet.prototype.union = function(i, j) {
  var iRepresentative = this.find(i);
  var jRepresentative = this.find(j);
  this.parent[iRepresentative] = jRepresentative;
  //console.log(i,'from',j)
};

function intersectRect(x0, y0, x1, y1, x2, y2, x3, y3) {
  return !(x2 > x1 || x3 < x0 || y2 > y1 || y3 < y0);
};

function mergeRectangles_(rects) {
  var disjointSet = new DisjointSet(rects.length);
  const REGIONS_OVERLAP = 0.5

  for (var i = 0; i < rects.length; i++) {
    var r1 = rects[i];
    for (var j = 0; j < rects.length; j++) {
      //console.log('for',i,j)
      var r2 = rects[j];
      if (intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height, r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
        //console.log('intersect')
        var x1 = Math.max(r1.x, r2.x);
        var y1 = Math.max(r1.y, r2.y);
        var x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        var y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
        var overlap = (x1 - x2) * (y1 - y2);
        var area1 = (r1.width * r1.height);
        var area2 = (r2.width * r2.height);

        //console.log('overlap',overlap, 'area1',area1, 'area2',area2)
        if ((overlap / (area1 * (area1 / area2)) >= REGIONS_OVERLAP) &&
          (overlap / (area2 * (area1 / area2)) >= REGIONS_OVERLAP)) {
          disjointSet.union(i, j);
        }
      }
    }
  }

  var map = {};
  for (var k = 0; k < disjointSet.length; k++) {
    var rep = disjointSet.find(k);
    if (!map[rep]) {
      map[rep] = {
        total: 1,
        width: rects[k].width,
        height: rects[k].height,
        x: rects[k].x,
        y: rects[k].y
      };
      continue;
    }
    map[rep].total++;
    map[rep].width += rects[k].width;
    map[rep].height += rects[k].height;
    map[rep].x += rects[k].x;
    map[rep].y += rects[k].y;
  }

  var result = [];
  Object.keys(map).forEach(function(key) {
    var rect = map[key];
    result.push({
      total: rect.total,
      width: (rect.width / rect.total + 0.5) | 0,
      height: (rect.height / rect.total + 0.5) | 0,
      x: (rect.x / rect.total + 0.5) | 0,
      y: (rect.y / rect.total + 0.5) | 0
    });
  });

  return result;
}

function downsample(pixels, width, height){

  const roi_x = 0;
  const roi_y = 0;
  const target_width = 90;
  const target_height = 160;
  const x_scale = 8;
  const y_scale = 8;
  var sampled = new Uint8Array(target_width * target_height * 4)

  for (var y = 0; y < target_height; y++)
  {
    var src_index = (y * y_scale + roi_y) * width * 4 + roi_x * 4;
    var dst_index = y * target_width * 4;
    //console.log('y=', y)
    //console.log('src_index=', src_index)
    //console.log('dst_index=', dst_index)
    for (var x = 0; x < target_width; x++)
    {
      //console.log('x=', x)
      sampled[dst_index] = pixels[src_index];
      sampled[dst_index + 1] = pixels[src_index + 1];
      sampled[dst_index + 2] = pixels[src_index + 2];
      dst_index += 4;
      src_index += 4 * x_scale;
    }
  }
  return {buffer:sampled, width:target_width, height:target_height};
}

function normRectangles_(rects, width, height)
{
  for (var i = 0; i < rects.length; i++) {
    rects[i].x = rects[i].x / parseFloat(width)
    rects[i].y = rects[i].y / parseFloat(height)
    rects[i].width = rects[i].width / parseFloat(width)
    rects[i].height = rects[i].height / parseFloat(height)
  }
  return rects
}

function face_detect(pixels, width, height) {
  
  //console.log('start face_detect');
  const initialScale = 1
  const scaleFactor = 1.25
  const stepSize = 1.7
  const edgesDensity = 0.2
  const data = model_data.classifiers
  //console.log(pixels)
  var total = 0;
  var rects = [];
  var integralImage = new Int32Array(width * height);
  var integralImageSquare = new Int32Array(width * height);
  var tiltedIntegralImage = new Int32Array(width * height);

  var integralImageSobel;
  if (edgesDensity > 0) {
    integralImageSobel = new Int32Array(width * height);
  }

  computeIntegralImage(pixels, width, height, integralImage, integralImageSquare, tiltedIntegralImage, integralImageSobel);
  //console.log('after computeIntegralImage');

  var minWidth = data[0];
  var minHeight = data[1];
  var scale = initialScale * scaleFactor;
  var blockWidth = (scale * minWidth) | 0;
  var blockHeight = (scale * minHeight) | 0;

  while (blockWidth < width && blockHeight < height) {
    var step = (scale * stepSize + 0.5) | 0;
    for (var i = 0; i < (height - blockHeight); i += step) {
      for (var j = 0; j < (width - blockWidth); j += step) {

        if (edgesDensity > 0) {
          if (isTriviallyExcluded(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight)) {
            continue;
          }
        }

        if (evalStages_(data, integralImage, integralImageSquare, tiltedIntegralImage, i, j, width, blockWidth, blockHeight, scale)) {
          //console.log(blockWidth, blockHeight, j, i)
          rects[total++] = {
            width: blockWidth, 
            height: blockHeight,
            x: j, 
            y: i 
          };
        }
      }
    }

    scale *= scaleFactor;
    blockWidth = (scale * minWidth) | 0;
    blockHeight = (scale * minHeight) | 0;
  }
  //console.log('before merge', rects);
  var merged_rects =  mergeRectangles_(rects);
  return normRectangles_(merged_rects, width, height);
}


module.exports = {
  average: average,
  face_detect: face_detect,
  downsample: downsample,
  print_img: print_img
}