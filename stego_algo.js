// Basis of Algorithm: https://github.com/jes/hideimage/blob/master/hideimage.js

// HIDING IMAGES --------------------------------------------------

// Step 1 - Loading the Cover Image

    // You can UPLOAD your own cover image
    $('#cover').change(function(e) {
        changed = true;
        loadImage('cover', drawImagePreview);
    });

// Step 2 - Loading the Secret Image

    // You can UPLOAD your own secret image
    $('#secret').change(function(e) {
        changed = true;
        loadImage('secret', drawImagePreview);
    });

// Step 3 - Outputting the COMBINED Image (Cover + Secret Image)

    // You can adjust the number of bits being hidden
    // more bits = easier to see the hidden image but better quality
    // less bits = harder to see the hidden image but lower quality

    $('#hide-minus-bits').click(function(){
        var bits_text = $('#bitsdisplay').text();
        var bits_num = parseInt(bits_text);

        var bits_minused = bits_num - 1;

        if(bits_minused > 0) {
            $('#bitsdisplay').empty()

            $('#bitsdisplay').html("<b>"+bits_minused.toString()+"</b>");

            changed = true;
            if (loaded_img["cover"] && loaded_img["secret"])
                makeHideImagePreview(bits_minused);
        }

        console.log("HIDING IMAGES - MINUS BUTTON - " + bits_minused)

    });

    $('#hide-add-bits').click(function(){
        var bits_text = $('#bitsdisplay').text();
        var bits_num = parseInt(bits_text);

        var bits_added = bits_num + 1;

        if(bits_added < 8) {
            $('#bitsdisplay').empty()

            $('#bitsdisplay').html("<b>"+bits_added.toString()+"</b>");

            changed = true;
            if (loaded_img["cover"] && loaded_img["secret"])
                makeHideImagePreview(bits_added);
        }

        console.log("HIDING IMAGES - MINUS BUTTON - " + bits_added)
    });

// UNHIDING IMAGES --------------------------------------------------

// Step 1 - Loading the COMBINED Image (aka the Steg Image)

    // You can UPLOAD your own steg image
    $('#stegimage').change(function(e) {
        changed = true;
        loadImage('stegimage', drawUnhideImagePreview);
    });

// Step 2 - Outputting the HIDDEN Image

    // You can adjust the number of bits being hidden
    // slider was not used in our implementation
    // $('#bits2').slider({
    //     min: 1,
    //     max: 7,
    //     slide: function(e, ui) {
    //         $('#unhidebitsdisplay').text(ui.value + " (release to process)");
    //     },
    //     change: function(e, ui) {
    //         $('#unhidebitsdisplay').text(ui.value);
    //         $('#unhidethrob').show();
    //         setTimeout(function() {
    //             changed = true;
    //             if (loaded_img["stegimage"])
    //                 makeUnhideImagePreview(ui.value);
    //         }, 20);
    //     },
    // });


// VARIABLES --------------------------------------------------

var changed = true;

var factor = {
    "cover": 0.001,
    "secret": 0.001,
};
var k = 0.001;
var opposite = {
    "cover": "secret",
    "secret": "cover",
};

var loaded_img = {
    "cover": undefined,
    "secret": undefined,
    "stegimage": undefined,
};

var stegdataurl;


// GENERAL FUNCTIONS --------------------------------------------------

// Loading images takes in 2 values
    // which = the id name it will look for
    // cb = the callback? to draw the image
function loadImage(which, cb) {
    var input = $('#' + which)[0];

    loaded_img[which] = undefined;

    var img = new Image;
    img.onload = function() {
        loaded_img[which] = img;
        cb(which);
    }
    img.src = URL.createObjectURL(input.files[0]);
}

// NOT NEEDED
// function loadPresetImage(which, cb) { 
//     loaded_img[which] = undefined;

//     var img = new Image;
//     img.onload = function() {
//         loaded_img[which] = img;
//         cb(which);
//     }
//     img.src = $('#'+which+'-preset').val() + '.png';
// }


// HIDING IMAGES FUNCTIONS --------------------------------------------------

// This function will draw the image inside of the canvas 
function drawImagePreview(which, recursed) {
    var id = '#' + which + 'canvas';

    var ctx = $(id)[0].getContext('2d');

    var targetw = $(id)[0].width;
    var targeth = $(id)[0].height;

    var img = loaded_img[which];
    var imgw = img.width;
    var imgh = img.height;
    var wfactor = img.width / targetw;
    var hfactor = img.height / targeth;
    factor[which] = wfactor;
    if (hfactor > factor[which])
        factor[which] = hfactor;

    k = factor[which];
    if (factor[opposite[which]] > factor[which])
        k = factor[opposite[which]];

    // draw the image to the canvas
    ctx.clearRect(0, 0, targetw, targeth);
    ctx.drawImage(img, 0, 0, imgw / k, imgh / k);

    var bits = $('#bitsdisplay').text();

    if (loaded_img[opposite[which]]) {
        if (!recursed) {
            drawImagePreview(opposite[which], 1);
        } else {
            makeHideImagePreview(bits);
        }
    }
}

function makeHideImagePreview(bits) {
    var ctx = $('#outputcanvas')[0].getContext('2d');
    ctx.clearRect(0, 0, 300, 300);
    ctx.font = '15px sans-serif';
    ctx.fillText("Processing...", 10, 30);

    setTimeout(function() {
        var coverctx = $('#covercanvas')[0].getContext('2d');
        var coverdata = coverctx.getImageData(0, 0, loaded_img["cover"].width/k, loaded_img["cover"].height/k);
        var secretctx = $('#secretcanvas')[0].getContext('2d');
        var secretdata = secretctx.getImageData(0, 0, loaded_img["secret"].width/k, loaded_img["secret"].height/k);

        doHideImage(coverdata, secretdata, bits);

        ctx.clearRect(0, 0, 300, 300);
        ctx.putImageData(coverdata, 0, 0);
    }, 20);
}

// this is in the onload for the body tag in the html
function hideImage() {
    loadImage('cover', drawImagePreview);
    loadImage('secret', drawImagePreview);
}

function doHideImage(coverdata, secretdata, bits) {
    var coverpix = coverdata.data;
    var secretpix = secretdata.data;

    var minw = coverdata.width;
    var minh = coverdata.height;
    if (secretdata.width < minw)
        minw = secretdata.width;
    if (secretdata.height < minh)
        minh = secretdata.height;

    var mask = (0xff >>> bits) << bits;

    for (var y = 0; y < minh; y++) {
        var covery = y*coverdata.width;
        var secrety = y*secretdata.width;
        for (var x = 0; x < minw; x++) {
            var coveridx = 4 * (covery + x);
            var secretidx = 4 * (secrety + x);

            // red
            coverpix[coveridx] = (coverpix[coveridx] & mask) + (secretpix[secretidx] >>> (8 - bits));

            // green
            ++coveridx;
            coverpix[coveridx] = (coverpix[coveridx] & mask) + (secretpix[++secretidx] >>> (8 - bits));

            // blue
            ++coveridx;
            coverpix[coveridx] = (coverpix[coveridx] & mask) + (secretpix[++secretidx] >>> (8 - bits));
        }
    }
}

// UNHIDING IMAGES FUNCTIONS --------------------------------------------------

// This function will draw the image inside of the canvas 
function drawUnhideImagePreview() {
    var ctx = $('#stegcanvas')[0].getContext('2d');

    var imgw = loaded_img["stegimage"].width;
    var imgh = loaded_img["stegimage"].height;

    var k = imgw / 300;
    if ((imgh / 300) > k)
        k = imgh / 300;

    ctx.clearRect(0, 0, 300, 300);
    ctx.drawImage(loaded_img["stegimage"], 0, 0, imgw / k, imgh / k);

    makeUnhideImagePreview();
}

function makeUnhideImagePreview() {
    var ctx = $('#hiddencanvas')[0].getContext('2d');
    ctx.clearRect(0, 0, 300, 300);
    ctx.font = '15px sans-serif';
    ctx.fillText("Processing...", 10, 30);

    setTimeout(function() {
        var steg = document.createElement('canvas');

        var imgw = loaded_img["stegimage"].width;
        var imgh = loaded_img["stegimage"].height;

        steg.width = imgw;
        steg.height = imgh;
        var stegctx = steg.getContext('2d');
        stegctx.drawImage(loaded_img["stegimage"], 0, 0, imgw, imgh);
        var stegdata = stegctx.getImageData(0, 0, imgw, imgh);

        // make a full size canvas and unhide image on it, then scale that down for display
        // cache the result so that it can be downloaded quicker


        var bits2 = $('#unhidebitsdisplay').text();

        doUnhideImage(stegdata, bits2);

        var k = imgw / 300;
        if ((imgh / 300) > k)
            k = imgh / 300;

        var img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, 300, 300);
            ctx.drawImage(img, 0, 0, imgw / k, imgh / k);
        }
        stegctx.putImageData(stegdata, 0, 0);
        stegdataurl = steg.toDataURL();
        img.src = stegdataurl;
    }, 20);
}

function doUnhideImage(stegdata, bits) {
    var stegpix = stegdata.data;

    var w = stegdata.width;
    var h = stegdata.height;

    for (var y = 0; y < h; y++) {
        var stegy = y*w;
        for (var x = 0; x < w; x++) {
            var stegidx = 4*(stegy + x);

            // red
            stegpix[stegidx] = (stegpix[stegidx] << (8 - bits)) & 0xff;

            // green
            ++stegidx;
            stegpix[stegidx] = (stegpix[stegidx] << (8 - bits)) & 0xff;

            // blue
            ++stegidx;
            stegpix[stegidx] = (stegpix[stegidx] << (8 - bits)) & 0xff;
        }
    }
}


