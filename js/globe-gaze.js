(function(){

    var mapId = "cesium-div";
    var mapDiv = $(mapId)[0]; // Map div object
    var live = false; // Check if we're good to go

    var viewer = new Cesium.Viewer(mapId);
    var camera = viewer.camera;
    var position = Cesium.Cartographic.clone(camera.positionCartographic);
    position.height = 10000000.0;
    console.log("Height: ", position.height);
    camera.setView({
        destination: Cesium.Cartesian3.fromRadians(position.longitude, position.latitude, position.height)
    });
    var scene = viewer.scene;

    viewer.infoBox.frame.sandbox = "allow-same-origin allow-top-navigation allow-pointer-lock allow-popups allow-forms allow-scripts";
    scene.screenSpaceCameraController.enableRotate = false;
    scene.screenSpaceCameraController.enableTranslate = false;
    scene.screenSpaceCameraController.enableZoom = false;
    scene.screenSpaceCameraController.enableTilt = false;
    scene.screenSpaceCameraController.enableLook = false;

    init();


    function init() {

        // Initialise WebGazer
        webgazer.setRegression('weightedRidge')
            .setTracker('clmtrackr')
            .setGazeListener(gazeHandler)
            .begin()
            .showPredictionPoints(true); /* shows a square every 100 milliseconds where current prediction is */

        setTimeout(checkIfReady, 100);
    }

    function gazeHandler(data, clock) {

        var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        var movement = 0.005; // Movement in longitude or latitude
        var movementWidth = 0.06; // 6 % (Edges?)

        var xtotal = 0;
        var xcount = 0;
        var ytotal = 0;
        var ycount = 0;
        var cycle = 0;
        var storedClock = 0;

        if (data && live) {

            webgazer.util.bound(data); // Bind to the viewport
            //console.log(data);
            var xprediction = data.x; //these x coordinates are relative to the viewport
            var yprediction = data.y; //these y coordinates are relative to the viewport

            xtotal += xprediction;
            xcount += 1;

            ytotal += yprediction;
            ycount += 1;

            if (clock > storedClock) {

                storedClock = clock + 333; // 3 times a second

                var xaverage = (xtotal / xcount);
                var yaverage = (ytotal / ycount);

                if ( xaverage > w  - (w * movementWidth) ) {  // If greater than 90% of width

                    // Right
                    moveCamera("longitude", movement);
                    overlay("right");

                } else if ( xaverage < w * movementWidth ) { // If less than 10% of width

                    // Left
                    moveCamera("longitude", -movement);
                    overlay("left");

                }  else {

                    overlay("none");

                }

                // We add an extra 20% as the tracker seems biased towards up!
                if ( yaverage > h - (h * movementWidth + 0.20) ) {

                    // Down
                    moveCamera("latitude", -movement);
                    overlay("right");


                } else if ( yaverage < h * (movementWidth ) ) {

                    // Up
                    moveCamera("latitude", movement);
                    overlay("up");


                } else {
                    overlay("none");
                }

                xtotal = xcount = ytotal = ycount = 0; // Set all to 0

            }

        }

    }

    function moveCamera(axis, delta) {


        var position = Cesium.Cartographic.clone(camera.positionCartographic);
        var longitude = position.longitude; //+ Cesium.Math.toRadians(5.0);
        var latitude = position.latitude; //+ Cesium.Math.toRadians(0.1);

        if ( axis === "latitude" && !isNaN(delta) ) {

            if ( (latitude + delta) > 90 ) {
                //latitude = 89.9;
            }
            else if ( (latitude + delta) < -90) {
                //latitude =  -89.9;
            }
            else {
                latitude = latitude + delta;
            }

        }
        else if ( axis === "longitude" && !isNaN(delta) ) {

            if ( (longitude + delta) > 180) {
                longitude = 179.9;
            }
            else if ( (longitude + delta) < -180 ) {
                longitude = -179.9;
            }
            else {
                longitude = longitude + delta;
            }

        }

        // Make sure valid numbers
        if ( !isNaN(latitude) && !isNaN(longitude) ) {

            camera.setView({
                destination: Cesium.Cartesian3.fromRadians(longitude, latitude, position.height)
            });

            posSmooth = 0.0005;
            negSmooth = -posSmooth;

            if (latitude > 0 && longitude > 0) {
                latSmoothing = posSmooth;
                lngSmoothing = negSmooth;
            }
            if (latitude > 0 && longitude < 0) {
                latSmoothing = posSmooth;
                lngSmoothing = negSmooth;
            }
            if (latitude < 0 && longitude > 0) {
                latSmoothing = negSmooth;
                lngSmoothing = posSmooth;
            }
            if (latitude < 0 && longitude < 0) {
                latSmoothing = negSmooth;
                lngSmoothing = posSmooth;
            }

            var lngSmoothed, latSmoothed;
            for (var i=0; i < 20; i++) {
                lngSmoothed = longitude + lngSmoothing;
                latSmoothed = latitude + latSmoothing;
                camera.setView({
                    destination: Cesium.Cartesian3.fromRadians(lngSmoothed, latSmoothed, position.height)
                });
            }


        }

    }

    function addTrainer(iterations) {

        var trainerContent = "<div id='trainer'>Look here, click me (<span id='num-clicks'>5</span>)</div>";
        var trainer = $(trainerContent).appendTo("#training-container");
        console.log("appending");

        var i = 1;
        var previousX = "top";
        var previousY = "left";
        var cycle = 0;
        var totalCycles = 0;
        var fiveClicks = 5;

        var order = {
            1: ["top", "right"],
            2: ["bottom", "left"],
            3: ["bottom", "right"],
            4: ["top", "left"],
            5: ["top", "left"] // Middle !
        };

        $(trainer).on("click", function() {

            if (totalCycles < iterations && fiveClicks === 1) {

                cycle += 1;

                var x = order[i][0];
                var y = order[i][1];

                $(trainer).css( previousX, "initial");
                $(trainer).css( previousY, "initial");

                if (i != 5) {
                    $(trainer).css("position", "absolute");
                    $(trainer).css("transform", "initial");
                    $(trainer).css("margin", "initial");
                    $(trainer).css( x, "0px");
                    $(trainer).css( y, "0px");
                }
                else {

                    $(trainer).css("position", "relative");
                    $(trainer).css("top", "50%");
                    $(trainer).css("transform", "translateY(-50%)");
                    $(trainer).css("margin", "auto");

                }

                previousY = y;
                previousX = x;

                if (i == 5) {
                    i = 1;
                } else {
                    i++;
                }

                if (cycle == 25) {
                    totalCycles += 1; // We reached a full training cycle
                    cycle = 0;
                }

                fiveClicks = 5;
                $("#num-clicks").html(String(fiveClicks));

            } else if (totalCycles < iterations && fiveClicks !== 0) {

                cycle += 1;
                // We haven't reached the full 5 clicks yet
                fiveClicks -= 1;
                $("#num-clicks").html(String(fiveClicks));


            }

            if (totalCycles === iterations) {

                console.log("cycles reached!");

                $("#training-container").css("display", "none");
                $("#webgazerVideoFeed, #webgazerVideoCanvas, #overlay").css("z-index", 100); //Show camera etc
                live = true;

            }

        });
    }



    function overlay(pan) {

        var overlayDiv = $("body")[0];

        if (pan === "up") {
            $(overlayDiv).removeClass("pan-down");
            $(overlayDiv).addClass("pan-up");
        }
        else if (pan === "down") {
            $(overlayDiv).removeClass("pan-up");
            $(overlayDiv).addClass("pan-down");
        }

        else if (pan === "left") {
            $(overlayDiv).removeClass("pan-right");
            $(overlayDiv).addClass("pan-left");
        }
        else if (pan === "right") {
            $(overlayDiv).removeClass("pan-left");
            $(overlayDiv).addClass("pan-right");
        }
        else if (pan === "none") {
            $(overlayDiv).removeClass("pan-right");
            $(overlayDiv).removeClass("pan-left");
            $(overlayDiv).removeClass("pan-up");
            $(overlayDiv).removeClass("pan-down");
        }


    }

    function setup() {

        var width = 260;
        var height = 180;
        var topDist = '0px';
        var rightDist = '0px';

        var video = document.getElementById('webgazerVideoFeed');
        video.style.display = 'block';
        video.style.position = 'absolute';
        video.style.top = topDist;
        video.style.left = rightDist;
        video.width = width;
        video.height = height;
        video.style.margin = '0px';
        //video.style.opacity = 0;

        wgWidth = video.offsetWidth;
        wgHeight = video.offsetHeight;

        webgazer.params.imgWidth = wgWidth;
        webgazer.params.imgHeight = wgHeight;

        var overlay = document.createElement('canvas');
        overlay.id = 'overlay';
        overlay.style.position = 'absolute';
        overlay.width = width;
        overlay.height = height;
        overlay.style.top = topDist;
        overlay.style.left = rightDist;
        overlay.style.margin = '0px';
        //video.style.opacity = 0;

        document.body.appendChild(overlay);

        var cl = webgazer.getTracker().clm;
        var gazeDotVisible = false;

        // Loading and Trainer
        $("#loading").remove();
        $("#modal").show();
        $("#yep").one("click", function(){
            $("#modal").remove();
            $('#overlay').click(function(){

                if (gazeDotVisible) {
                    $('#gaze-dot').css("opacity", "1").fadeIn();
                } else {
                    $('#gaze-dot').css("opacity", "0").fadeOut();
                }
                gazeDotVisible = !gazeDotVisible;

            });
            addTrainer(2);
        });


        function drawLoop() {
            requestAnimFrame(drawLoop);
            overlay.getContext('2d').clearRect(0, 0, width, height);
            if (cl.getCurrentPosition()) {
                cl.draw(overlay);
            }
        }
        drawLoop();

    }

    function checkIfReady() {
        if (webgazer.isReady()) {

            setup();
        } else {
            setTimeout(checkIfReady, 100);
        }
    }

})();
