var imgInstance, sourcePath;
var canvas = null, frame_canvas = null;
var SCALE_FACTOR = 1.1;
var canvasScale = 1;
var state, state_undo = [], state_redo = [];
//var frame = 1;
var frame;
$(document).ready(function () {
    /*$('#left_column').add($('#right_column')).remove();
    $('#center_column').attr('class', 'grid_10');*/
    canvas = new fabric.Canvas('c');
});

$(function () {
    createNewSepia();
    $('#fileupload').change(function (evt) {
        $('#fileuploadtext').val(evt.target.files[0].name);
        $('.fileinput-button').removeClass('btn-success').addClass('btn-default');
        $('#upload_btn').removeAttr('disabled').addClass('btn-success').click(function (e) {
            fileSelect(evt);
        });
    });

    $('.scale_btn').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        var percent = $(this).parents('.control_group').find('.scale_value');
        var value = parseInt(percent.attr('data-count'));
        if ($(this).attr('id') == 'scale_plus') {
            value = value + 10;
            zoomIn();
        } else {
            value = value - 10;
            zoomOut();
        }
        percent.html(value + '%');
        percent.attr('data-count', value);
        frame_update();
    });

    $('.rotate_btn').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        var elm = $(this);
        canvas.forEachObject(function (o) {
            if (o.id == 'puppy') {
                if (elm.attr('id') == 'plus')  o.setAngle(imgInstance.angle + 90).setCoords();
                else o.setAngle(o.angle - 90).setCoords();
            }
        });
        canvas.renderAll();
        frame_update();
    });

    $('.fit_to').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        var elm = $(this);
        canvas.forEachObject(function (o) {
            if (o.id == 'puppy') {
                if (elm.attr('id') == 'fit_width') {
                    o.scaleToWidth(canvas.getWidth());
                } else if (elm.attr('id') == 'fit_height') {
                    o.scaleToHeight(canvas.getHeight());
                } else {
                    o.center();
                }
                o.setCoords();
            }
        });
        canvas.renderAll();
        frame_update();
    });

    $('.move_btn').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        var type = $(this).attr('id');
        canvas.forEachObject(function (o) {
            if (o.id == 'puppy') {
                var point = o.getCenterPoint();

                if (type == 'left') {
                    o.left = point.x - 10;
                }
                if (type == 'up') {
                    o.top = point.y - 10;
                }
                if (type == 'right') {
                    o.left = point.x + 10;
                }
                if (type == 'down') {
                    o.top = point.y + 10;
                }
                o.setCoords();
            }
        });
        canvas.renderAll();
        frame_update();
    });

    $('#gray_filter').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        canvas.forEachObject(function (o) {
            if (o.id == 'puppy') {
                o.filters.push(new fabric.Image.filters.Grayscale());
                o.applyFilters(function () {
                    canvas.renderAll.bind(canvas);
                    frame_update();
                });
            }
        });
    });

    $('#sepia_filter').click(function (e) {
        e.preventDefault();
        canvasSaveState();
        canvas.forEachObject(function (o) {
            if (o.id == 'puppy') {
                o.filters.push(
                    new fabric.Image.filters.NewSepia(),
                    new fabric.Image.filters.Brightness({ brightness: 5 })
                );

                o.applyFilters(function () {
                    canvas.renderAll.bind(canvas);
                    frame_update();
                });
            }
        });
        canvas.renderAll();
        frame_update();
    });

    $('#undo').click(function () {
        if (state_undo.length == 0) return false;
        var undo = state_undo[state_undo.length - 1];
        state_redo.push(undo);
        state_undo.pop();

        canvas.clear();
        canvas.loadFromDatalessJSON(undo, function () {
            canvas.renderAll();
        });
    });

    $('#redo').click(function () {
        if (state_redo.length == 0) return false;
        var redo = state_redo[0];

        state_redo.shift();
        canvas.clear();
        canvas.loadFromDatalessJSON(redo, function () {
            canvas.renderAll();
        });
    });
});

function canvasSaveState() {
    if (imgInstance.hasStateChanged()) {
        state = JSON.stringify(canvas.toDatalessJSON(['id']));
        state_undo.push(state);
    }
}
function fileSelect(evt) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        var files = evt.target.files;

        var result = '';
        var reader;
        var file;
        for (var i = 0; file = files[i]; i++) {
            // if the file is not an image, continue
            if (!file.type.match('image.*')) {
                continue;
            }

            reader = new FileReader();
            reader.onload = (function (tFile) {
                return function (evt) {
                    sourcePath = evt.target.result;
                    loadImages(evt.target.result, initStage);

                    //Set text after add file
                    $('#fileuploadtext').val($('#file_upload_lang').val());
                    $('#browse_text').text($('#file_upload_another_lang').val());

                    //Set button status after upload
                    $('#upload_btn').attr('disabled', 'disabled');
                    $('#upload_btn').addClass('btn-success');
                };
            }(file));
            reader.readAsDataURL(file);
        }
    } else {
        alert('The File APIs are not fully supported in this browser.');
    }
}

function loadImages(sources, callback) {
    var image;
    image = new Image();
    image.onload = function () {
        callback(image);
    };
    image.src = sources;
}

function initStage(image) {
    frame = $('#frame_number').val();
    //Initiate Canvas
    if (canvas == null) {
        /*canvas = new fabric.Canvas('c');
        canvas.calcOffset();*/
    }
    else
        canvas.clear();

    //Create Image
    imgInstance = new fabric.Image(image, {
        originX: 'center', originY: 'center',
        left:0, top: 0,
        hasRotatingPoint: false, lockUniScaling: true
    });
    imgInstance.id = 'puppy';

    var triangle = new fabric.Triangle({
        width: 20, height: 30, fill: 'blue', left: 50, top: 50
    });

    //Quality Calculate
    var quality = '';
    var fixed_percent = imgInstance.getWidth() * 100 / $('#width').val();
    if (0 < fixed_percent && fixed_percent < 40) {
        quality = 'Low Quality';
    } else if (40 < fixed_percent && fixed_percent < 60) {
        quality = 'Medium Quality';
    } else {
        quality = 'High Quality';
    }

    $('#quality_text').html(quality);

    //Create frame group
    var rect_group = createRect();

    canvas.setDimensions({width: 655, height: 538});
    var new_width = (canvas.getWidth() - 40) / parseInt(frame);
    canvas.add(imgInstance);
    //canvas.add(rect_group);

//    imgInstance.center().setCoords();
//    rect_group.center().setCoords();

    canvas.renderAll();
    var group_objects = rect_group.getObjects();
    var left = (canvas.getWidth() - rect_group.getWidth()) / 2;
    var top = (canvas.getHeight() - rect_group.getHeight()) / 2;

    $.each(group_objects, function (i, val) {
        i = i++;
        var new_canvas = canvas.toDataURL({
            left: left, top: top,
            width: group_objects[i].width, height: group_objects[i].height
        });

        fabric.util.loadImage(new_canvas, function (img) {
            group_objects[i].fill = new fabric.Pattern({
                source: img,
                repeat: 'repeat'
            });
            canvas.renderAll();
        });
        left = left + parseInt(group_objects[i].width) + 5;
    });
    $('#fit_center').click();
    imgInstance.opacity = 0.5;
    canvasSaveState();

    canvas.on('object:modified', function (e) {
        var activeObject = e.target;
        frame_update(activeObject);
    });

    canvas.forEachObject(function(obj) {
        var setCoords = obj.setCoords.bind(obj);
        obj.on({
            moving: setCoords,
            scaling: setCoords,
            rotating: setCoords
        });
    })
}
function frame_update(activeObject) {
    imgInstance.opacity = 1;
    var new_width = (canvas.getWidth() - 40) / parseInt(frame);
    var filter = canvas.item(1);
    var src = null, canvase = null;
    var new_rect = null;

    //Rerender frames
    canvas.remove(filter);
    if (!activeObject)
        activeObject = canvas.item(0);

    var rect_group = createRect();
    canvas.add(rect_group);
    rect_group.center().setCoords();
    canvas.renderAll();

    //Fill image to frames
    var group_objects = rect_group.getObjects();
    var left = (canvas.getWidth() - rect_group.getWidth()) / 2;
    var top = (canvas.getHeight() - rect_group.getHeight()) / 2;

    $.each(group_objects, function (i, val) {
        i = i++;
        var new_canvas = canvas.toDataURL({
            left: left, top: top,
            width: group_objects[i].width, height: group_objects[i].height
        });

        fabric.util.loadImage(new_canvas, function (img) {
            group_objects[i].fill = new fabric.Pattern({
                source: img,
                repeat: 'repeat'
            });

            canvas.renderAll();
        });
        left = left + parseInt(group_objects[i].width) + 5;
    });
    imgInstance.opacity = 0.5;
    canvasSaveState();
}
function createRect() {
    var rect;
    var new_width = (canvas.getWidth() - 40) / parseInt(frame);
    var left = 0;
    rect = new fabric.Rect({
        left: left, top: 0,
        width: new_width, height: 450,
        fill: 'transparent',
        strokeWidth: 1, stroke: '#040204',
    });

    var rect_group = [];
    if (frame == 1)
        rect_group.push(rect);
    else {
        for (var i = 1; i <= frame; i++) {
            left = left + rect.width + 5;
            var rect_tmp = null;
            rect_tmp = rect.clone();
            rect_tmp.id = 'rectangle' + i;
            rect_tmp.left = left;
            rect_group.push(rect_tmp);
        }
    }
    var group = new fabric.Group(rect_group, {
        selectable: false,
    });
    return group;
}

// Zoom In
function zoomIn() {
    canvasScale = canvasScale * SCALE_FACTOR;

    var objects = canvas.getObjects();

    for (var i in objects) {
        if (objects[i].id == 'puppy') {
            var scaleX = objects[i].scaleX;
            var scaleY = objects[i].scaleY;
            var left = objects[i].left;
            var top = objects[i].top;

            var tempScaleX = scaleX * SCALE_FACTOR;
            var tempScaleY = scaleY * SCALE_FACTOR;
            var tempLeft = left * SCALE_FACTOR;
            var tempTop = top * SCALE_FACTOR;

            objects[i].scaleX = tempScaleX;
            objects[i].scaleY = tempScaleY;
            objects[i].left = tempLeft;
            objects[i].top = tempTop;

            objects[i].setCoords();
        }
    }

    canvas.renderAll();
}

// Zoom Out
function zoomOut() {
    canvasScale = canvasScale / SCALE_FACTOR;

    var objects = canvas.getObjects();
    for (var i in objects) {
        if (objects[i].id == 'puppy') {
            var scaleX = objects[i].scaleX;
            var scaleY = objects[i].scaleY;
            var left = objects[i].left;
            var top = objects[i].top;

            var tempScaleX = scaleX * (1 / SCALE_FACTOR);
            var tempScaleY = scaleY * (1 / SCALE_FACTOR);
            var tempLeft = left * (1 / SCALE_FACTOR);
            var tempTop = top * (1 / SCALE_FACTOR);

            objects[i].scaleX = tempScaleX;
            objects[i].scaleY = tempScaleY;
            objects[i].left = tempLeft;
            objects[i].top = tempTop;

            objects[i].setCoords();
        }
    }

    canvas.renderAll();
}

// Reset Zoom
function resetZoom() {

    var objects = canvas.getObjects();
    for (var i in objects) {
        var scaleX = objects[i].scaleX;
        var scaleY = objects[i].scaleY;
        var left = objects[i].left;
        var top = objects[i].top;

        var tempScaleX = scaleX * (1 / canvasScale);
        var tempScaleY = scaleY * (1 / canvasScale);
        var tempLeft = left * (1 / canvasScale);
        var tempTop = top * (1 / canvasScale);

        objects[i].scaleX = tempScaleX;
        objects[i].scaleY = tempScaleY;
        objects[i].left = tempLeft;
        objects[i].top = tempTop;

        objects[i].setCoords();
    }

    canvas.renderAll();

    canvasScale = 1;
}

function dataURLtoBlob(dataURL) {
    // Decode the dataURL
    var binary = atob(dataURL.split(',')[1]);
    // Create 8-bit unsigned array
    var array = [];
    for (var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    // Return our Blob object
    return new Blob([new Uint8Array(array)], {type: 'image/png'});
}

function createNewSepia() {
    // TODO create exact sepia image filter
    // set of sepia colors
//    var r, g , b, avg;
    var r = [0, 0, 0, 1, 1, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 17, 18, 19, 19, 20, 21, 22, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 44, 45, 47, 48, 49, 52, 54, 55, 57, 59, 60, 62, 65, 67, 69, 70, 72, 74, 77, 79, 81, 83, 86, 88, 90, 92, 94, 97, 99, 101, 103, 107, 109, 111, 112, 116, 118, 120, 124, 126, 127, 129, 133, 135, 136, 140, 142, 143, 145, 149, 150, 152, 155, 157, 159, 162, 163, 165, 167, 170, 171, 173, 176, 177, 178, 180, 183, 184, 185, 188, 189, 190, 192, 194, 195, 196, 198, 200, 201, 202, 203, 204, 206, 207, 208, 209, 211, 212, 213, 214, 215, 216, 218, 219, 219, 220, 221, 222, 223, 224, 225, 226, 227, 227, 228, 229, 229, 230, 231, 232, 232, 233, 234, 234, 235, 236, 236, 237, 238, 238, 239, 239, 240, 241, 241, 242, 242, 243, 244, 244, 245, 245, 245, 246, 247, 247, 248, 248, 249, 249, 249, 250, 251, 251, 252, 252, 252, 253, 254, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
     g = [0, 0, 1, 2, 2, 3, 5, 5, 6, 7, 8, 8, 10, 11, 11, 12, 13, 15, 15, 16, 17, 18, 18, 19, 21, 22, 22, 23, 24, 26, 26, 27, 28, 29, 31, 31, 32, 33, 34, 35, 35, 37, 38, 39, 40, 41, 43, 44, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 56, 57, 58, 59, 60, 61, 63, 64, 65, 66, 67, 68, 69, 71, 72, 73, 74, 75, 76, 77, 79, 80, 81, 83, 84, 85, 86, 88, 89, 90, 92, 93, 94, 95, 96, 97, 100, 101, 102, 103, 105, 106, 107, 108, 109, 111, 113, 114, 115, 117, 118, 119, 120, 122, 123, 124, 126, 127, 128, 129, 131, 132, 133, 135, 136, 137, 138, 140, 141, 142, 144, 145, 146, 148, 149, 150, 151, 153, 154, 155, 157, 158, 159, 160, 162, 163, 164, 166, 167, 168, 169, 171, 172, 173, 174, 175, 176, 177, 178, 179, 181, 182, 183, 184, 186, 186, 187, 188, 189, 190, 192, 193, 194, 195, 195, 196, 197, 199, 200, 201, 202, 202, 203, 204, 205, 206, 207, 208, 208, 209, 210, 211, 212, 213, 214, 214, 215, 216, 217, 218, 219, 219, 220, 221, 222, 223, 223, 224, 225, 226, 226, 227, 228, 228, 229, 230, 231, 232, 232, 232, 233, 234, 235, 235, 236, 236, 237, 238, 238, 239, 239, 240, 240, 241, 242, 242, 242, 243, 244, 245, 245, 246, 246, 247, 247, 248, 249, 249, 249, 250, 251, 251, 252, 252, 252, 253, 254, 255],
     b = [53, 53, 53, 54, 54, 54, 55, 55, 55, 56, 57, 57, 57, 58, 58, 58, 59, 59, 59, 60, 61, 61, 61, 62, 62, 63, 63, 63, 64, 65, 65, 65, 66, 66, 67, 67, 67, 68, 69, 69, 69, 70, 70, 71, 71, 72, 73, 73, 73, 74, 74, 75, 75, 76, 77, 77, 78, 78, 79, 79, 80, 81, 81, 82, 82, 83, 83, 84, 85, 85, 86, 86, 87, 87, 88, 89, 89, 90, 90, 91, 91, 93, 93, 94, 94, 95, 95, 96, 97, 98, 98, 99, 99, 100, 101, 102, 102, 103, 104, 105, 105, 106, 106, 107, 108, 109, 109, 110, 111, 111, 112, 113, 114, 114, 115, 116, 117, 117, 118, 119, 119, 121, 121, 122, 122, 123, 124, 125, 126, 126, 127, 128, 129, 129, 130, 131, 132, 132, 133, 134, 134, 135, 136, 137, 137, 138, 139, 140, 140, 141, 142, 142, 143, 144, 145, 145, 146, 146, 148, 148, 149, 149, 150, 151, 152, 152, 153, 153, 154, 155, 156, 156, 157, 157, 158, 159, 160, 160, 161, 161, 162, 162, 163, 164, 164, 165, 165, 166, 166, 167, 168, 168, 169, 169, 170, 170, 171, 172, 172, 173, 173, 174, 174, 175, 176, 176, 177, 177, 177, 178, 178, 179, 180, 180, 181, 181, 181, 182, 182, 183, 184, 184, 184, 185, 185, 186, 186, 186, 187, 188, 188, 188, 189, 189, 189, 190, 190, 191, 191, 192, 192, 193, 193, 193, 194, 194, 194, 195, 196, 196, 196, 197, 197, 197, 198, 199];
    fabric.Image.filters.NewSepia = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
        type: 'NewSepia',
        applyTo: function (canvasEl) {
            var context = canvasEl.getContext('2d'),
//                imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height),data = imageData.data;
                imageData = context.getImageData(0, 0, canvasEl.width, canvasEl.height);

            for (var i = 0, len = imageData.data.length; i < len; i += 4) {
                // change image colors
                 /*imageData.data[i] = r[imageData.data[i]];
                 imageData.data[i + 1] = g[imageData.data[i + 1]];
                 imageData.data[i + 2] = b[imageData.data[i + 2]];*/

                /*r = imageData.data[i];
                 g = imageData.data[i + 1];
                 b = imageData.data[i + 2];

                 imageData.data[i] = (r * 0.393 + g * 0.769 + b * 0.189 ) * 1.351;
                 imageData.data[i + 1] = (r * 0.349 + g * 0.686 + b * 0.168 ) / 1.083;
                 imageData.data[i + 2] = (r * 0.272 + g * 0.534 + b * 0.131 ) / 1.540;
                 imageData.data[i + 2] = 0;*/

                r = imageData.data[i];
                g = imageData.data[i + 1];
                b = imageData.data[i + 2];

                imageData.data[i] = (0.3 * r + 0.59 * g + 0.11 * b )* 1.554;
                imageData.data[i + 1] = (0.3 * r + 0.59 * g + 0.11 * b )/ 1.283;
                imageData.data[i + 2] = 0;

                /*avg = 0.3 * r + 0.59 * g + 0.11 * b;
                imageData.data[i] = avg + 255;
                imageData.data[i + 1] = avg + 165;
                imageData.data[i + 2] = avg;*/

                // apply noise
                var noise = 20;
                if (noise > 0) {
                    noise = Math.round(noise - Math.random() * noise);

                    for (var j = 0; j < 3; j++) {
                        var iPN = noise + imageData.data[i + j];
                        imageData.data[i + j] = (iPN > 255) ? 255 : iPN;
                    }
                }
            }

            context.putImageData(imageData, 0, 0);
        }
    });

    fabric.Image.filters.NewSepia.fromObject = function (object) {
        return new fabric.Image.filters.NewSepia(object);
    };
}
