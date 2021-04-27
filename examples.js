scripts = {
/***************************************************************/
"Examples/Bars":function(ctx, analyser, audioContext, include) {
var Color = include('Utilities/Color');
var Music = include('Utilities/Music');
var Draw  = include('Utilities/Drawing');

Music.config(256,0.9);

var freq = Music.getFrequencyData();
var peak = Music.getPeakData(freq);
var width = ctx.canvas.width;
var height = ctx.canvas.height;

Draw.clear();

var scale = height;
var scaledF = freq.map(function(x) { return x * scale; });
var step = width/freq.length;

// bars
var gradient = ctx.createLinearGradient(0,0,0,height);
gradient.addColorStop(0,Color.hsla(0));
gradient.addColorStop(1,Color.hsla(100));
ctx.strokeStyle = gradient;
ctx.lineWidth = step-2;
for (var i=0; i<freq.length; i++) {
    ctx.beginPath();
    ctx.moveTo(step*i + step/2, height);
    ctx.lineTo(step*i + step/2, height - freq[i]*height);
    ctx.stroke();
}

// peaks
ctx.strokeStyle = Color.hsla(0,100,100);
ctx.lineWidth = step-2;
for (var i=0; i<peak.length; i++) {
    ctx.beginPath();
    ctx.moveTo(step*i + step/2, height - peak[i]*height);
    ctx.lineTo(step*i + step/2, height - peak[i]*height + 2);
    ctx.stroke();
}
},

/***************************************************************/
"Examples/Cityscape":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(512,0.8);
var wave = Music.getWaveformData(32);
var freq = Music.getFrequencyData();
var peak = Music.getPeakData(freq);

var pctPeaks, r;
pctPeaks = Music.getPctRisingPeaks();
this.frame = (this.frame||0) + 1;

var width = ctx.canvas.width;
var height = ctx.canvas.height;


/* Fade bottom layer */
ctx.beginPath();
ctx.fillStyle = Color.hsla(0,0,0,0.1);
ctx.rect(0,height*0.66,width,height*0.34);
ctx.fill();

/* Fade whole screen */
Draw.clear(Color.hsla(220,100,5,pctPeaks*0.5));

function avg(array) {
    return array.reduce(function(sum, x) { return sum+x; }, 0)/array.length;
}

var vol = avg(freq);

var min = 0;
var max = 256;
var step = width/(max-min);
var scale = height * Music.getFrequencyHz(min);
var noiseRadius = 4;
for (var f=min; f<max; f++) {
    var a, b, neighborhood, noise, signal, x,y,i,t,a, hue, hz, stretch, pct, spiralX, spiralY;
    a = Math.max(f - noiseRadius, 0);
    b = Math.min(f + noiseRadius, freq.length-1);
    neighborhood = freq.slice(a, b);
    noise = avg(neighborhood);
    signal = Math.min(1,Math.max(0, freq[f] - noise));

    stretch = Math.random()*1000*signal;
    hz = Music.getFrequencyHz(f);
    t = height * 2 * signal*signal;
    i= signal * 6;
    a = step * Math.pow(t,0.5) * (Math.random()*2-1)*signal;

    x = (f-min)*step + step/2;
    y =  height*0.66;

    hue = Math.min((30+500*signal),255);
    //hue = Math.min((180+200*signal),255);
    
    // middle layer
    h = height*4 * signal*signal;
    ctx.beginPath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = Color.hsla(hue,100,50);
    ctx.rect(x-a,y-h,a*6,h);
    ctx.stroke();
    ctx.fill();
    
    ctx.beginPath();
    ctx.fillStyle = Color.hsla(hue,100,30,0.2);
    ctx.rect(x-a,y,a*6,h);
    ctx.fill();
    
    // bottom layer
    //t = height /2 * (1-signal);
    if (signal > 0.14 && freq[f] > 0.5) {
        t = t*200*signal;
        a = a*30;
        i = height*0.34/t;
        hue = (f%2)*100;

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = Color.hsla(0,f%2*80,100-(f%2)*50,0.6);
        Draw.sinePath(x,y, Math.PI/2, i, t, a*5);
        ctx.stroke();
    }
       
    
}

/* Circle sky */
this.skyHue = (this.skyHue || 0) + pctPeaks * 10;
r = pctPeaks*width/2;
ctx.lineWidth = 10+pctPeaks*100;
hue = 225 + (this.skyHue%60);  // (220+pctPeaks*56) % 256;
ctx.strokeStyle = Color.hsla(hue,100,60,0.3);
ctx.fillStyle = Color.hsla(0,0,0,0.1);
x = Math.random()*width;
y = Math.random()*Math.random()*height*0.66; // -r -ctx.lineWidth;
Draw.circle(r,x,y);
ctx.fill();


/* Purple Mountains */
if (pctPeaks > 0.25) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,width,height*0.66);
    ctx.clip();
    hue = 255;
    ctx.lineWidth = 10;
    ctx.strokeStyle = Color.hsla(hue,100,50,1);
    ctx.fillStyle = Color.hsla(hue,100,50,0.3);
    ctx.beginPath();
    ctx.moveTo(0,height*0.66);
    for (var i=0; i<wave.length-2; i+=2) {
        var x = i * width / wave.length;
        var y = wave[i] * height*2 - height*0.34;
        ctx.lineTo(x,y);
    }
    ctx.lineTo(x,height*0.66);
    //ctx.stroke();
    ctx.fill();
    ctx.restore();
}
},

/***************************************************************/
"Examples/Concentric":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw  = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(512, 0.25);
var freq = Music.getFrequencyData().slice(0, analyser.fftSize/8);

// Transform
Transform.center();
Transform.zoom(1 + freq[0]/100);

// Draw
var scale = Math.min(ctx.canvas.width, ctx.canvas.height) / 2;
var step = 1/180;
ctx.lineWidth = 1;
for (var i = 0; i<freq.length; i++) {
    var f = freq[i];
    var hue = 256 - f*256;
    var lum = f*60;
    var r = scale - i * scale / freq.length;
    ctx.strokeStyle = Color.hsla(hue,100,lum);
    Draw.circle(r);
}
},

/***************************************************************/
"Examples/Kaleidoscope":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048);
var wave = Music.getWaveformData(4);

Music.config(2048,0.9);
var freq = Music.getFrequencyData();
var tone = Music.getToneData(freq);
var peakData = Music.getPeakData(freq);
var rise = Music.getPctRisingPeaks();
var peak = Music.getPctPeaks();

var width = ctx.canvas.width;
var height = ctx.canvas.height;
var scale = Math.min(width/2,height/2);

var x,y,r,hue, slices,d,dx,dy, a,a2,a3;

// use a BeatCounter to cycle parameters
this.beat = this.beat || new Music.BeatCounter(20);
this.beat.countIf(peak > 0.1);

Transform.center();

// change hue during attack
this.hue = (this.hue || 0) + rise * 10;

// seed waveform
ctx.lineWidth = 1 + Math.round(peak);
ctx.strokeStyle = Color.hsla(this.hue,100,50,0.3);
ctx.beginPath();
ctx.moveTo(0,0);
for (var i=0; i<wave.length-2; i+=2) {
    var x = i * width / wave.length;
    var y = (wave[i]-0.5) * height/4;
    ctx.lineTo(x,y);
}
ctx.lineTo(x,0);
ctx.stroke();

// seed circles
r = rise*rise*width;
ctx.lineWidth = 10+rise*100;
ctx.strokeStyle = Color.hsla(this.hue%128+180,100,60,0.5);
ctx.fillStyle = Color.hsla(0,0,0,0.5);
x = Math.random()*width/2;
y = Math.random()*x;
if (r>1) {
    Draw.circle(r,x,y);
    ctx.fill();
}

// Spin the seeds
if (this.beat.confidence < 0.1) {
    Transform.spin(Math.PI/360 * peakData[0]);
}
if (this.beat.on(1)) {
    Transform.spin(Math.PI/30);
}

// 3 parameters determine number of slices for each kaleidoscope
this.c1 = this.c1 || 6;
if (this.beat.on(4)) {
    this.c1 += (Math.random()>0.5?2:-2);
    this.c1 = Math.min(32,Math.max(4,this.c1));
}
this.c2 = this.c2 || 14;
if (this.beat.on(8)) {
    this.c2 += (Math.random() > 0.5 ? 2 : -2);
    this.c2 = Math.min(24,Math.max(6,this.c2));
}

// 4 possible positions for 2nd Kaleidoscope (-x-y, -x+y, +x-y, +x+y)
if (this.c2x == null || this.beat.on(32)) {
    this.c2x = (Math.random()>0.5?1:-1);
    this.c2y = 1; //(Math.random()>0.5?1:-1); // -1 causes flickering?
}

// Kaleidoscope #1
Transform.kaleidoscope({slices:this.c1, x:0, y: 0, debug: false});

// Kaleidoscope #2

if (this.c2x !== 0) {
    slices = this.c2;
    x = 0;
    y = 0;
    d = scale/2;

    dx = d * this.c2x;
    dy = d * this.c2y;
    a = Math.atan2(dy,dx) - 2*Math.PI/slices/2;
    Transform.kaleidoscope({slices:slices, x:x-dx, y:y-dy, rotation:a});
    Transform.mirror(x+dx, y+dy, Math.atan2(dy,dx));
    Transform.mirror(x+dx*2, y, Math.atan2(-dy,dx));
    Transform.mirror(x-dx, y+dy*2, Math.atan2(dy,-dx));
}

// print parameters
//Transform.center(0,0);
//Draw.debug(this.c1,this.c2,this.c2x,this.c2y, this.beat.bpm.toFixed(0), this.beat.confidence.toFixed(1));
},

/***************************************************************/
"Examples/Kaleidoscope 2":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048);
var wave = Music.getWaveformData(4);

Music.config(2048,0.9);
var freq = Music.getFrequencyData();
var tone = Music.getToneData(freq);
var peakData = Music.getPeakData(freq);
var rise = Music.getPctRisingPeaks();
var peak = Music.getPctPeaks();

var width = ctx.canvas.width;
var height = ctx.canvas.height;
var size = Math.sqrt(width*width + height*height);
var scale = Math.min(width/2,height/2);

var x,y,r,hue, slices,d,dx,dy,da,a,a2,a3;

// use a BeatCounter to cycle parameters
this.beat = this.beat || new Music.BeatCounter(20);
this.beat.countIf(peak > 0.12);

Transform.center();

// kaleidoscope parameter determines number of slices
this.c1 = this.c1 || 12;
if (this.beat.on(4)) {
    this.c1 += (Math.random()>0.5?2:-2);
    this.c1 = Math.min(24,Math.max(6,this.c1));
}
this.c3 = this.c3 || 12;
if (this.beat.on(12)) {
    this.c3 += (Math.random() > 0.5 ? 2 : -2);
    this.c3 = Math.min(24,Math.max(6,this.c3));
}

// 5 possible positions for 3rd Kaleidoscope (1/4, 1/3, hide, 2/3, 3/4)
if (this.c3x == null || this.beat.on(32)) {
    this.c3x = Math.floor(Math.random()*3-1);
    if (Math.round(Math.random())) {
        this.c3d = Math.floor(width/6) * this.c3x;
    } else {
        this.c3d = Math.floor(width/4) * this.c3x;
        //this.c3d = scale * this.c3x;
    }
}

// style determines mirror clipping
if (this.style == null || this.beat.on(32)) {
    this.style = Math.round(Math.random()) ? 'snowflake' : 'spiral';
}

// set parameters for debugging
//this.c1=6; this.style = 'snowflake';
//this.c3 = 16;
//this.c3x = -1;
//this.c3d = width/2 * this.c3x;
//this.c3d = width/4 * this.c3x;

// change hue during attack
this.hue = (this.hue || 0) + rise * 10;

// seed waveform
ctx.lineWidth = 10;
a = Math.PI * Math.random();
Transform.save();
Transform.rotate(a);
ctx.lineWidth = 1 + Math.round(peak);
ctx.fillStyle = Color.hsla(this.hue,100,0,0.3);
ctx.strokeStyle = Color.hsla(this.hue,100,50,0.9);
ctx.beginPath();
ctx.moveTo(0,0);
for (var i=0; i<wave.length-2; i+=2) {
    var x = i * width / wave.length;
    var y = (wave[i]-0.5) * height/8;
    ctx.lineTo(x,y);
}
ctx.lineTo(x,0);
ctx.stroke();
ctx.fill();
Transform.restore();

if (this.beat.on(1)) {
    if (peak < 0.2) {
        // seed circles
        r = rise*rise*width;
        ctx.lineWidth = 10+rise*100;
        ctx.strokeStyle = Color.hsla(this.hue%128+180,100,60,0.5);
        ctx.fillStyle = Color.hsla(0,0,0,0.5);
        x = (Math.random()-0.5)*scale*2;
        y = Math.random()*x*2 * Math.sin(2*Math.PI/this.c1);
        if (r>1) {
            Draw.circle(r,x,y);
            ctx.fill();
        }
    } else {
        // seed rectangles
        ctx.lineWidth = rise * scale;
        ctx.strokeStyle = Color.hsla(this.hue%64*5,100,50,0.5);
        ctx.fillStyle = Color.hsla(this.hue,100,10,0.25);
        a = Math.PI * Math.random();
        x = Math.random() * scale;
        y = Math.random() * x;
        w = Math.random() * rise * scale * 10;
        h = Math.random() * rise * scale * 10;
        if (w > 1 && w > 1) {
            Transform.save();
            Transform.translate(x,y);
            Transform.rotate(a);
            ctx.beginPath();
            ctx.rect(0,0,w,h);
            ctx.stroke();
            ctx.fill();
            Transform.restore();
        }
    }
}
// Spin the seeds
if (peak > 0.14) {
    if (Math.round(Math.random())) {
        Transform.zoom(1 + peak);
    } else {
        Transform.zoom(1 - peak);
    }
} else if (peak > 0.12) {
    Transform.spin(-Math.PI/15 * Math.sqrt(rise));
}
Transform.spin(Math.PI/720);


// Kaleidoscope #1
Transform.kaleidoscope({x:0, y:0, slices:this.c1, clipRadius:scale, debug:false});

// Mirrors
var extra = this.style === 'spiral' ? 4 : 0;
for (var i=0; i<this.c1+extra; i+=1) {
    da = (2*Math.PI/this.c1);
    d = scale * Math.cos(da/2);
    a = i * da;
    x = 0;
    y = 0;
    
    Transform.save();
    if (this.style === 'snowflake') {
        Transform.rotate(i*da);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, Math.tan(da) * width);
        ctx.closePath();
        ctx.clip();
        Transform.rotate(-i*da);
    } else if (this.style === 'spiral') {
        if (i < this.c1) {
            Transform.rotate((i+1)*da);
        }
        ctx.beginPath();
        ctx.rect(-width,-height,width*3,height);
        ctx.clip();
        if (i < this.c1) {
            Transform.rotate(-(i+1)*da);
        }
    }
    
    a = i * da + da/2;
    x = 0 + Math.cos(a) * d;
    y = 0 + Math.sin(a) * d;
    Transform.mirror(x,y,a);
    //Draw.arrow(x,y,a);
    
    Transform.restore();
    
    
}
// Kaleidoscope #3
if (this.c3x !== 0) {
    x=0; y=0;
    slices = this.c3;
    a = Math.PI/2 - Math.PI/2*this.c3x;
    a2 = a + this.c3x * 2*Math.PI/slices;
    a3 = a + this.c3x * 2*Math.PI/slices * 2;
    Transform.kaleidoscope({slices:slices, x:x-this.c3d, y:y, rotation:a});
    if (this.c3d === Math.floor(width/4) * this.c3x) {
        Transform.mirror(x + this.c3d, y, Math.PI/2 - Math.PI/2 * this.c3x);
    }
    
    /*
    Transform.mirror(x + this.c3x*width/2, y + (width-(x-this.c3d))*Math.tan(a2) - 0.5*this.c3x, this.c3x*a3);
    Transform.mirror(x + this.c3x*width/2, y - (width-(x-this.c3d))*Math.tan(a2) + 0.5*this.c3x, -this.c3x*a3);
    */
}


// print parameters
//Transform.center(0,0);
//Draw.debug(width/2,height/2);
//Draw.debug(width,height,this.c1,this.c2,this.c3, this.c2x,this.c2y,this.c3x,this.c3d);
},

/***************************************************************/
"Examples/Landscape":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(512);
var wave = Music.getWaveformData(4);

Music.config(2048,0.8);
var freq = Music.getFrequencyData();
var peakData = Music.getPeakData(freq);
var peak = Music.getPctRisingPeaks();
var width = ctx.canvas.width;
var height = ctx.canvas.height;
var x,y,r,hue;

/* squeeze */
ctx.save();
ctx.setTransform(1.001,0,0,1.005-peak*0.05, ctx.canvas.width/2, ctx.canvas.height*0.66);
ctx.translate(-ctx.canvas.width/2,-ctx.canvas.height*0.66);
ctx.drawImage(ctx.canvas, 0, 0);
ctx.restore();

/* Fade whole screen */
Draw.clear(Color.hsla(220,100,10,peak));

/* Circle sky */
this.skyHue = (this.skyHue || 0) + peak * 10;
r = peak*peak*width;
ctx.lineWidth = 10+peak*100;
hue = 225 - (this.skyHue%100);  // (220+peak*56) % 256;
ctx.strokeStyle = Color.hsla(hue,100,60,0.5);
ctx.fillStyle = Color.hsla(0,0,0,0.5);
x = Math.random()*width;
y = Math.random()*Math.random()*height*0.66; // -r -ctx.lineWidth;
Draw.circle(r,x,y);
ctx.fill();


/* Purple Mountains */
hue = 255;
ctx.lineWidth = 1;
//ctx.strokeStyle = Color.hsla(hue,100,50,1);
ctx.fillStyle = Color.hsla(hue,100,60,0.25);
ctx.beginPath();
ctx.moveTo(0,height*0.66);
for (var i=0; i<wave.length-2; i+=2) {
    var x = i * width / wave.length;
    var y = height - wave[i] * height*0.66;
    ctx.lineTo(x,y);
}
ctx.lineTo(x,height*0.66);
//ctx.stroke();
ctx.fill();

/* Reflection */
Transform.mirror(width/2,height*0.66,Math.PI/2);
},

/***************************************************************/
"Examples/Light Painting":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048);
var wave = Music.getWaveformData(4);

Music.config(2048,0.9);
var freq = Music.getFrequencyData();
var vol = Music.avg(freq);
var tone = Music.getToneData(freq);
var peakData = Music.getPeakData(freq);
var rise = Music.getPctRisingPeaks();
var peak = Music.getPctPeaks();

var width = ctx.canvas.width;
var height = ctx.canvas.height;
var scale = Math.min(width/2,height/2);

var x,y,r,hue, slices,d,dx,dy, a,a2,a3;

// use a BeatCounter to cycle parameters
this.beat = this.beat || new Music.BeatCounter(20);
this.beat.countIf(peak > 0.1);

Transform.center(0,0);

// cycle hue
this.hue = (this.hue || 0) + rise * 10;

// gradual fade at low volume
if (vol < 0.5) {
    Draw.clear(Color.hsla(0,0,0,(0.5-vol)*0.1));
}

// start a new line
if (this.beat.on(1) 
|| this.x == null || this.y == null 
|| this.x<0 || this.x>width 
|| this.y<0 || this.y>height) {
    this.x = parseInt(Math.random() * width/2 + width/4);
    this.y = parseInt(Math.random() * height/2 + height/4);
    this.cx = this.x;
    this.cy = this.y;
}

// random angle & distance
var a = Math.random() * Math.PI*2;
var d = Math.random() * width/16 * vol*3;
var dx = d * Math.cos(a);
var dy = d * Math.sin(a);

// move control point to continue curve from last frame
if (this.cx != null) {
    var cdx = this.x - this.cx;
    var cdy = this.y - this.cy;
    var ca = Math.atan2(cdy, cdx);
    var cd = Math.sqrt(cdx*cdx + cdy*cdy);
    this.cx = this.x + d* Math.cos(ca);
    this.cy = this.y + d* Math.sin(ca);
}

// draw quadratic curve
ctx.lineCap = "round";
ctx.lineWidth=20*rise;
ctx.strokeStyle = Color.hsla(this.hue,100,50,1);
ctx.beginPath();
ctx.moveTo(this.x,this.y);
ctx.quadraticCurveTo(this.cx, this.cy, this.x + dx, this.y + dy);
ctx.stroke();

// update x,y for next frame
this.x += dx;
this.y += dy;
},

/***************************************************************/
"Examples/Polar Oscilliscope":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw  = include('Utilities/Drawing');
var Transform  = include('Utilities/Transform');
var wave1, wave2, scale;
Music.config();
wave1 = Music.getWaveformData(32);
scale1 = Math.min(ctx.canvas.width, ctx.canvas.height)*0.6;
wave2 = Music.getWaveformData(0);
scale2 = Math.min(ctx.canvas.width, ctx.canvas.height)*0.3;

Transform.center();
Draw.clear();

ctx.lineWidth = 20;
ctx.strokeStyle = Color.hsla(120,100,20);
ctx.fillStyle = Color.hsla(120,100,10);

ctx.beginPath();
Draw.polarPath(wave1, scale1);
ctx.closePath();
ctx.stroke();
ctx.fill();

ctx.lineWidth = 3;
ctx.strokeStyle = Color.hsla(120,100,50);
ctx.fillStyle = Color.hsla(120,100,20);

ctx.beginPath();
Draw.polarPath(wave2, scale2);
ctx.closePath();
ctx.stroke();
ctx.fill();
},

/***************************************************************/
"Examples/Polar Spectrogram":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Transform  = include('Utilities/Transform');

Music.config(2048, 0);
var freq = Music.getFrequencyData().slice(0,analyser.fftSize/8);

Transform.center();
this.frame = (this.frame||0) + 1;

var scale = Math.min(ctx.canvas.width, ctx.canvas.height) / 2;
var step = Math.PI/360;
var a1 = (this.frame*step) % (2*Math.PI);
var a2 = ((this.frame+1)*step) % (2*Math.PI) + Math.PI/360;

ctx.lineWidth = scale / freq.length + 0.5;
for (var i = 0; i<freq.length; i++) {
    var f = freq[i];
    var hue = 256 - f*256;
    var lum = f*50;
    var r = scale - i * scale / freq.length;
    ctx.strokeStyle = Color.hsla(hue,100,lum);
    ctx.beginPath();
    ctx.arc(0, 0, r, a1, a2);
    ctx.stroke();
}
},

/***************************************************************/
"Examples/Spinner":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw = include('Utilities/Drawing');
var Move = include('Utilities/Transform');

analyser.fftSize = 512;
analyser.smoothingTimeConstant = 0.85;
var freq = Music.getFrequencyData();

var scale = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.75;
var scaledF = freq.map(function(x) { return x * scale; });

var vol = scaledF.reduce(function(sum, x) { return sum+x; }, 0) / scaledF.length;
var speed = freq[16] * Math.PI/90;
var hue = Math.floor(256 - freq[0]*256);
var bass = scaledF.slice(0, analyser.fftSize/8);
var mid = scaledF.slice(analyser.fftSize/8, analyser.fftSize/4);

this.beat = this.beat || 0;
this.dir = this.dir || 1;
if (freq[100] > 0.5) {
    if (!this.beat) {
        this.dir = -this.dir;
    }
    this.beat = 10;
} else {
    if (this.beat > 0) {
        this.beat -= 1;
    }
}
speed = this.dir * speed;

// transform effect
Move.center();
Move.spin(speed);
Move.zoom(1+freq[16]/100);

// outer butterflies
ctx.lineWidth = scale*0.1*freq[16];
ctx.strokeStyle = Color.hsla(hue,100,50,0.3);
Draw.radialSpectrum(bass);

// rays
ctx.lineWidth = scale*0.1*freq[64];
ctx.strokeStyle = Color.hsla((hue+92)%256,100,50,0.2);
for (var i=0; i<30; i++) {
    Draw.ray(bass[i]*0.6,mid[i]*Math.PI/12 + Math.PI/2);
}
// inner burst of color
ctx.strokeStyle = Color.hsla((hue+184)%256,100,50,0.2);
Draw.radialSpectrum(mid);
},

/***************************************************************/
"Examples/Strings":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw  = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048,0);
var freq = Music.getFrequencyData();

var width = ctx.canvas.width;
var height = ctx.canvas.height;

Draw.clear();
ctx.lineWidth = 1;

function avg(array) {
    return array.reduce(function(sum, x) { return sum+x; }, 0)/array.length;
}

var vol = avg(freq);

var min = 0;
var max = 48;
var step = width/(max-min);
var scale = height * Music.getFrequencyHz(0);
var noiseRadius = 4;
for (var f=min; f<max; f++) {
    var a, b, neighborhood, noise, signal, x,y,i,t,a, hue, hz, stretch;
    a = Math.max(f - noiseRadius, 0);
    b = Math.min(f + noiseRadius, freq.length-1);
    neighborhood = freq.slice(a, b);
    noise = avg(neighborhood);
    signal = Math.max(0, freq[f] - noise);

    stretch = Math.random()*10*signal;

    x = (f-min)*step + step/2 + step * (Math.random()*2-1)*signal;
    y =  0 - stretch;

    hz = Music.getFrequencyHz(f);
    t = 2*scale/hz + stretch;
    i = (height-y)/t;
    a = step/2 * Math.pow(t,0.5) * (Math.random()*2-1)*signal * 2;

    hue = (40+256*(signal/vol))%256;
    ctx.strokeStyle = Color.hsla(hue,100,50*freq[f]);
    ctx.beginPath();
    Draw.sinePath(x,y, Math.PI/2, i, t, a);
    ctx.stroke();
}

//Transform.kaleidoscope({slices:16, x:width/2, y:height/2, rotation: Math.PI/4});
},

/***************************************************************/
"Examples/Strings2":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw  = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048,0);
var freq = Music.getFrequencyData();
var vol  = Music.avg(freq);
var tone = Music.getToneData(freq);

Draw.clear();
ctx.lineWidth = 2;
var width = ctx.canvas.width;
var height = ctx.canvas.height;

var dance = false;
var rollercoaster = false;
var min = 8;
var max = 120;
var step = width/(max-min);
var scale = height * Music.getFrequencyHz(min);
for (var f=min; f<max; f++) {
    var x,y,i,t,a, hue, hz, pct;
    hz = Music.getFrequencyHz(f);
    t = 2*scale/hz;
    if (dance) {
        t += Math.random()*1000*tone[f];
    }
    i = 0.5;
    //a = step/2 * Math.pow(t,0.5) * (Math.random()*2-1)*tone[f];
    a = step/2 * t/100 * (Math.random()*2-1) * tone[f];

    hue = (40+256*(tone[f]*tone[f]))%256;
    ctx.strokeStyle = Color.hsla(hue,100,50,freq[f]*freq[f]);
    ctx.beginPath();
    if (rollercoaster) {
        pct = (f-min)/(max-min);
        x =  Math.cos(Math.PI*pct*0.95 - Math.PI/2)*width*0.99;
        y = Math.sin(Math.PI*pct*1.7 - Math.PI*3/4)*height*0.48 + height/2 ;
        Draw.sinePath(x,y, Math.PI/2 + pct*5/4*Math.PI, i, t, a);
    } else {
        x = (f-min)*step + step/2;
        y =  height/2 - t/4;
        Draw.sinePath(x,y, Math.PI/2, i, t, a);
    }
    ctx.stroke();
}
//Draw.debug(Math.round(Music.getFrequencyHz(min)) + ' - ' + Math.round(Music.getFrequencyHz(max)) + ' Hz');
},

/***************************************************************/
"Examples/Strings3":function(ctx, analyser, audioContext, include) {
var Music = include('Utilities/Music');
var Color = include('Utilities/Color');
var Draw  = include('Utilities/Drawing');
var Transform = include('Utilities/Transform');

Music.config(2048,0.9);
var freq = Music.getFrequencyData();


Draw.clear();
ctx.lineWidth = 2;
var width = ctx.canvas.width;
var height = ctx.canvas.height;

function avg(array) {
    return array.reduce(function(sum, x) { return sum+x; }, 0)/array.length;
}

function getSignal(freq, f, r) {
    var a, b, neighborhood, noise, signal;
    a = Math.max(f - r, 0);
    b = Math.min(f + r, freq.length-1);
    neighborhood = freq.slice(a, b);
    noise = avg(neighborhood);
    signal = Math.max(0, freq[f] - noise);
    return signal;
}
function getSignal2(freq, f, r) {
    var a, b, neighborhood;
    a = Math.max(f - r, 0);
    b = Math.min(f + r, freq.length-1);
    neighborhood = freq.slice(a, b);
    if (freq[f] === Math.max.apply(Math,neighborhood)) {
        return freq[f];
    } else {
        return 0;
    }
}
function getSignal3(freq, f, r) {
    var a, b, neighborhood, noise, signal;
    a = Math.max(f - r, 0);
    b = Math.min(f + r, freq.length-1);
    neighborhood = freq.slice(a, b);
    noise = avg(neighborhood);
    signal = Math.min(1,Math.max(0, freq[f] / noise - 1));
    return signal;
}

var vol = avg(freq);

var min = 12;
var max = 23;
var step = width/(max-min);
var scale = height * Music.getFrequencyHz(min);
var noiseRadius = 3;

var f,hz,i,t,a,x,y,hue;
for (var f0=min; f0<max; f0++) {
    f = f0;
    hz = Music.getFrequencyHz(f);
    for (var h=0; h<5; h++) {
        if (h > 0) {
            // harmonic
            hz = hz * 2;
            f = f * 2;
        }
        signal = getSignal3(freq, f, noiseRadius);
        t = 2*scale/hz;
        //a = step/2 * Math.pow(t,0.5) * (Math.random()*2-1)*signal / 2;
        // a = step/2 * Math.pow(t,0.5) * (Math.random()>0.5?1:-1) * signal * 0.2;
        a = step * signal;
        i = 0.5 * Math.pow(2,h);
        if (h === 0) {
            // string position based on root
            x = (f0-min)*step + step/2;
            y =  height/2 + t/4;
        }
        hue = (40+256*signal/vol)%256;
        ctx.strokeStyle = Color.hsla(hue,100,50,freq[f]);
        ctx.beginPath();
        Draw.sinePath(x,y, 3*Math.PI/2, i, t, a);
        ctx.stroke();
    }
}
//Draw.debug(Math.round(Music.getFrequencyHz(min)) + ' - ' + Math.round(Music.getFrequencyHz(max)) + ' Hz');
},

/***************************************************************/
"Examples/Wave Grid":function(ctx, analyser, audioContext, include) {
var Color = include('Utilities/Color');
var Music = include('Utilities/Music');
var Draw = include('Utilities/Drawing');

analyser.fftSize = 1024;
analyser.smoothingTimeConstant = 0;
var wave = Music.getWaveformData();

this.frame = (this.frame||0)+1;

var tilesX = 8;
var tilesY = 16;

var dx = ctx.canvas.width / tilesX;
var dy = ctx.canvas.height / tilesY;
var x0 = dx * (this.frame % tilesX);
var y0 = dy * (Math.floor(this.frame/tilesX)%tilesY);


// darken previous frame's waveform
ctx.fillStyle = Color.hsla(120,100,0,0.8);
ctx.fill();

// draw grid
ctx.lineWidth = 1;
ctx.strokeStyle = Color.hsla(120,100,20);
ctx.fillStyle = 'black';
ctx.beginPath();
ctx.rect(x0,y0,dx,dy);
ctx.stroke();
ctx.fill();

// draw waveform
ctx.lineWidth = 1;
ctx.strokeStyle = Color.hsla(120);
ctx.beginPath();
for (var i=0; i<wave.length; i++) {
    var x = x0 + i * dx / wave.length + 1;
    var y = y0 + wave[i] * dy;
    if (i===0) {
        ctx.moveTo(x,y);
    } else {
        ctx.lineTo(x,y);
    }
}
ctx.stroke();

// set up rect that we will fill on the next frame
ctx.beginPath();
ctx.rect(x0,y0,dx,dy);
},

/***************************************************************/
"Examples/Waveform":function(ctx, analyser, audioContext, include) {
var Color = include('Utilities/Color');
var Music = include('Utilities/Music');
var Draw  = include('Utilities/Drawing');

Music.config(2048);
var wave = Music.getWaveformData(4);

Draw.clear();

ctx.lineWidth = 2;
ctx.strokeStyle = Color.hsla(120);
ctx.beginPath();
for (var i=0; i<wave.length-2; i+=2) {
    var x = i * ctx.canvas.width / wave.length;
    var y = wave[i] * ctx.canvas.height;
    if (i===0) {
        ctx.moveTo(x,y);
    } else {
        ctx.lineTo(x,y);
    }
}
ctx.stroke();
},

/***************************************************************/
"Utilities/Color":function(ctx, analyser, audioContext, include) {
/* Color
 *
 * Utility functions for constructing color strings.
 *
 * Example usage:
 *    var Color = include('Utilities/Color');
 *    ctx.strokeStyle = Color.hsla(120);
 */

/* hsla
 * Constructs a color string from components
 * h: hue        (0 - 255)
 * s: saturation (0 - 100) [default: 100]
 * l: luminance  (0 - 100) [default: 50]
 * a: alpha      (0 - 1.0) [default: 1.0]
 */
this.hsla = function(h,s,l,a) {
    s = (s != null ? s : 100);
    l = (l != null ? l : 50);
    a = (a != null ? a : 1.0);
    return 'hsla(' + h%256 + ',' + s + '%,' + l + '%,' + a + ')';
};

/* rgba
 * Constructs a color string from components
 * r: red        (0 - 255)
 * g: green      (0 - 255)
 * b: blue       (0 - 255)
 * a: alpha      (0 - 1.0) [default: 1.0]
 */
this.rgba = function(r,g,b,a) {
    a = (a != null ? a : 1.0);
    return 'rgba(' + r%256 + ',' + g%256 + ',' + b%256 + ',' + a + ')';
};

return this;
},

/***************************************************************/
"Utilities/Drawing":function(ctx, analyser, audioContext, include) {
/* Drawing
 *
 * A collection of utility functions for drawing stuff.
 *
 * Example usage:
 *    var Draw = include('Utilities/Drawing');
 *    Draw.circle(128);
 */
var ctx;

this.setContext = function(newCtx) {
    ctx = newCtx;
};

/* clear
 *
 * Clears the screen with the given color
 *
 * <c>: color [default: black]
 */
this.clear = function(c) {
    c = (c != null ? c : 'black');
    ctx.save();
    ctx.fillStyle = c;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.restore();
};

/* circle
 *
 * Draws a circle using current strokeStyle
 *
 * <r>: radius
 * <x>: center x coordinate [default: 0]
 * <y>: center y coordinate [default: 0]
 */
this.circle = function (r, x, y) {
    x = (x != null ? x : 0);
    y = (y != null ? y : 0);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2*Math.PI);
    ctx.stroke();
};

/* square
 *
 * Draws a square using current strokeStyle
 *
 * <r>: radius (1/2 side length)
 * <x>: center x coordinate [default: 0]
 * <y>: center y coordinate [default: 0]
 */
this.square = function(r, x, y) {
    x = (x != null ? x : 0);
    y = (y != null ? y : 0);
    ctx.beginPath();
    ctx.rect(x-r, y-r, x+r, y+r);
    ctx.stroke();
};

this.line = function(x1,y1, x2,y2) {
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.restore();
};

this.arrow = function(x,y,a) {
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x,y);
    x = x + 100*Math.cos(a);
    y = y + 100*Math.sin(a);
    ctx.lineTo(x, y);
    ctx.moveTo(x + 50*Math.cos(a+Math.PI*3/4), y + 50*Math.sin(a+Math.PI*3/4));
    ctx.lineTo(x, y);
    ctx.lineTo(x + 80*Math.cos(a-Math.PI*3/4), y + 80*Math.sin(a-Math.PI*3/4));
    ctx.stroke();
    ctx.restore();
};

this.ray = function(r,angle) {
    ctx.beginPath();
    ctx.moveTo(0,0);
    //var angle = frame % (2*Math.PI);
    ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
    ctx.stroke();
};
this.polygon = function(rArray, scale) {
    var angle, x, y;
    scale = (scale != null ? scale : 1);
    ctx.beginPath();
    for (var i = 0; i < rArray.length; i++) {
        angle = (Math.PI/2) + 2*Math.PI * i / rArray.length;
        x = rArray[i] * scale * Math.cos(angle);
        y = rArray[i] * scale * Math.sin(angle);
        if (i===0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.stroke();
};
this.polarPath = function(rArray, scale) {
    var angle, x, y;
    scale = (scale != null ? scale : 1);
    for (var i = 0; i < rArray.length; i++) {
        angle = (Math.PI/2) + 2*Math.PI * i / rArray.length;
        x = rArray[i] * scale * Math.cos(angle);
        y = rArray[i] * scale * Math.sin(angle);
        if (i===0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
};
this.radialSpectrum = function(data) {
    var data2 = data.slice(0, data.length);
    data2.reverse();
    data2.push.apply(data2,data);
    this.polygon(data2);
};

/* sinePath
 * 
 * Approximate a sine wave with bezier curves
 * 
 * x,y: starting coordinates
 * dir: wave direction
 * iterations: number of complete waves to draw [default: 1]
 * period: length of each wave [default: 50]
 * amplitude: size of each wave [default: 20]
 */
this.sinePath = function(x, y, dir, iterations, period, amplitude) {
    var i, cos, sin, dx, dy, t4;
    dir = dir || 0;
    iterations = (iterations != null ? iterations : 1);
    period     = (period != null ? period : 50);
    amplitude  = (amplitude != null ? amplitude : 20);
    cos = Math.cos(dir);
    sin = Math.sin(dir);
    t4 = period/4; // quarter period

    // bezier control points (and endpoint) relative to previous endpoint
    X=[[
        cos*t4/Math.PI               - sin*amplitude/2,
        cos*t4*2/Math.PI             - sin*amplitude,
        cos*t4                       - sin*amplitude
    ],[
        cos*t4/Math.SQRT2*2/Math.PI  + 0,
        cos*t4                       + sin*amplitude,
        cos*t4                       + sin*amplitude
    ],[
        cos*t4/Math.PI               + sin*amplitude/2,
        cos*t4*2/Math.PI             + sin*amplitude,
        cos*t4                       + sin*amplitude
    ],[
        cos*t4/Math.SQRT2*2/Math.PI  - 0,
        cos*t4                       - sin*amplitude,
        cos*t4                       - sin*amplitude
    ]];
    Y=[[
        cos*amplitude/2  + sin*t4/Math.PI,
        cos*amplitude    + sin*t4*2/Math.PI,
        cos*amplitude    + sin*t4
    ],[
        0                + sin*t4/Math.SQRT2*2/Math.PI,
        -cos*amplitude   + sin*t4,
        -cos*amplitude   + sin*t4
    ],[
        -cos*amplitude/2 + sin*t4/Math.PI,
        -cos*amplitude   + sin*t4*2/Math.PI,
        -cos*amplitude   + sin*t4
    ],[
        0                + sin*t4/Math.SQRT2*2/Math.PI,
        cos*amplitude    + sin*t4,
        cos*amplitude    + sin*t4
    ]];

    ctx.moveTo(x,y);
    for (i=0; i<iterations; i+=0.25) { // each quarter period
        var q = Math.round(4*i) % 4;
        ctx.bezierCurveTo(x + X[q][0], y + Y[q][0], 
                          x + X[q][1], y + Y[q][1], 
                          x + X[q][2], y + Y[q][2]);
        x += X[q][2];
        y += Y[q][2];
    }

};

/* debug
 *
 * Prints a line of debugging text at the top of the screen
 * 
 * <text>: string of text to display
 * <...>: if you provide multiple arguments they will all be printed
 */
this.debug = function(text /*, ...*/) {
    var formattedText;
    if (arguments.length > 1) {
        formattedText = Array.apply([],arguments).toString();
    } else {
        formattedText = text;
    }
    
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = 'black';
    ctx.fillRect(0,15,ctx.canvas.width,20);

    ctx.font = '16px monospace';
    ctx.fillStyle = 'white';
    ctx.fillText(formattedText,10,30);
    ctx.restore();
};

return this;
},

/***************************************************************/
"Utilities/Music":function(ctx, analyser, audioContext, include) {
/* Music
 *
 * Utility functions for analysing music.
 *
 * Example usage:
 *    var Music = include('Utilities/Music');
 *    Music.config(1024,0.5);
 *    var freq = Music.getFrequencyData();
 */
if (!this._initialized) {
    this._initialized = true;
    
    /* private variables */
    var peakData = [],
        peakSpeed = [],
        prevPeak = [],
        prevPeakSpeed = [],
        prevPeakSpeedCooldown = [];

    /* config
     * Changes common analyser configuration options
     * <fftSize>: twice the frequency bin count (32 - 2048; power of 2)
     * <smoothingTimeConstant>: averages audio data with previous frame (0.0 - 1.0)
     */
    this.config = function(fftSize, smoothingTimeConstant) {
        analyser.fftSize = fftSize || 2048;
        analyser.smoothingTimeConstant = smoothingTimeConstant || 0.8;
    };

    /* getFrequencyData
     *
     * Returns an array representing the current audio signal in the frequency domain.
     * The array will have fftSize/2 elements, each with a value between 0 and 1.
     */
    this.getFrequencyData = function() {
        var freq, array;
        freq = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(freq);
        array = Array.apply([], freq);
        return array.map(function(x) {
            var normalized = (x - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels);
            if (normalized < 0) {
                normalized = 0;
            } else if (normalized > 1) {
                normalized = 1;
            }
            return normalized;
        });
    };

    /* getWaveformData
     *
     * Returns an array representing the current audio signal in the time domain.
     * The array will have fftSize/2 elements, each with a value between 0 and 1.
     *
     * <smooth>: kernel size for smoothing function (0 - fftSize/2)
     */
    this.getWaveformData = function(smooth) {
        var i, j, sum, wave, array, smoothed;
        wave = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(wave);
        array = Array.apply([], wave);
        if (smooth) { // todo: optimize
            smoothed = [];
            for (i=0; i<array.length; i++) {
                sum = 0;
                for (j=-smooth; j<=smooth; j++) {
                    // wrap around smoothing
                    sum += array[(i+j+array.length)%array.length];
                }
                smoothed[i] = sum/(2*smooth+1);
            }
            array = smoothed;
        }
        return array.map(function(x) {return x/256;});
    };

    /* getPeakData
     *
     * Returns an array representing the audio peaks in the frequency domain.
     * The array will have fftSize/2 elements, each with a value between 0 and 1.
     *
     * <frequencyData>: frequency domain signal data (use getFrequencyData())
     * <peakDecay>: how fast peaks decay (0.0 - Infinity) [default: 1]
     */
    this.getPeakData = function(frequencyData, peakDecay) {
        var i;
        peakDecay = (peakDecay != null ? peakDecay : 1);
        // initialize peaks
        if (peakData.length !== frequencyData.length) {
            peakData = [];
            peakSpeed = [];
            for (i=0; i<frequencyData.length; i++) {
                peakData[i] = 0;
                peakSpeed[i] = 0;
            }
        }
        for (i=0; i<frequencyData.length; i++) {
            if (frequencyData[i] > peakData[i]) {
                // raise peak
                peakData[i] = frequencyData[i];
                peakSpeed[i] = 0;
            } else {
                // lower peak
                peakData[i] -= peakSpeed[i];
                peakSpeed[i] += peakDecay / 10000;
                if (peakData[i] < 0) {
                    peakData[i] = 0;
                    peakSpeed[i] = 0;
                }
            }
        }
        return peakData;
    };

    /* getPctPeaks
     *
     * Returns a number between 0.0 and 1.0 representing the percentage of 
     * frequency bands that are at their peak. With appropriate parameter values, 
     * this can be used for primitive beat detection.
     *
     * <cooldown>: minimum time between consecutive peaks (0 - Infinity) [default: 20]
     * <threshold>: minimum signal value that counts as a peak (0.0 - 1.0) [default: 0.1]
     */
    this.getPctPeaks = function(cooldown,threshold) {
        cooldown = (cooldown != null ? cooldown : 20);
        threshold = (threshold != null ? threshold : 0.1);
        var numPeaks = 0;
        for (var i=0; i<peakSpeed.length; i++) {
            prevPeakSpeedCooldown[i] = prevPeakSpeedCooldown[i] || 0;
            if (!prevPeakSpeedCooldown[i] && peakData[i] > threshold && prevPeakSpeed[i] === 0 && peakSpeed[i] > 0) {
                numPeaks += 1;
                prevPeakSpeedCooldown[i] = cooldown;
            } else {
                prevPeakSpeedCooldown[i] -= 1;
                if (prevPeakSpeedCooldown[i] < 0) {
                    prevPeakSpeedCooldown[i] = 0;
                }
            }
            prevPeakSpeed[i] = peakSpeed[i];
        }
        return numPeaks / peakSpeed.length;
    };

    /* getPctRisingPeaks
     *
     * Returns a number between 0.0 and 1.0 representing the percentage of 
     * frequency bands with peaks that are currently rising.
     */
    this.getPctRisingPeaks = function(fMin, fMax) {
        if (peakData == null) {
            this.getPeakData();
        }
        fMin = fMin != null ? fMin : 0;
        fMax = fMax != null ? fMax : peakData.length;
        var numRisingPeaks = 0;
        for (var i=fMin; i<peakData.length; i++) {
            if (peakData[i] > prevPeak[i]) {
                numRisingPeaks += 1;
            }
            prevPeak[i] = peakData[i];
        }
        return numRisingPeaks / peakData.length;
    };

    /* getDerivative
     *
     * Returns the first derivative of an array of data.
     *
     * <array>: array of data
     */
    this.getDerivative = function(array, prev) {

        var deriv = [0];
        for (var i=0; i<array.length; i++) {
            deriv[i] = array[i] - prev[i];
        }
        return deriv;
    };

    /* getToneData
     *
     * Returns an array representing tone strength in each frequency band.
     * Currently, this just subtracts a local average from each band.
     *
     * <freq>: frequency domain signal data (use getFrequencyData())
     * <r>: radius of local average (0 - fftSize/2)
     */
    this.getToneData = function(freq) {
        var deriv,last,max,min,a,b,i;
        var tones = [];
        max = freq[0];
        min = freq[0];
        a = 0;
        b = 0;
        for (var f=2; f<freq.length; f++) {
            if (freq[f] < min) {
                min = freq[f];
            }
            if (freq[f] > max) {
                max = freq[f];
            }
            // check for change in first derivative of freq
            if ( (freq[f]-freq[f-1]) * (freq[f-1]-freq[f-2]) <= 0) {
                a = b;
                b = f+1;
                for (i=a; i<b; i++) {
                    tones[i] = Math.sqrt(freq[i]-min);
                }
                max = freq[f];
                min = freq[f];
            }
        }
        return tones;
    };

    /* avg
     *
     * Computes the average of an array of values
     *
     * <array>: input values
     */
    this.avg = function(array) {
        return array.reduce(function(sum, x) { return sum+x; }, 0)/array.length;
    };

    /* getFrequencyHz
     *
     * Converts a frequency bin number into Hz
     *
     * <binNumber>: bin number (0 - fftSize/2)
     */
    this.getFrequencyHz = function(binNumber) {
        var nyquist = audioContext.sampleRate/2;
        var hz = (binNumber||0.5) * nyquist / analyser.frequencyBinCount;
        return hz;
    };

    /* getFrequencyBin
     *
     * Converts a frequency in Hz to the nearest bin number
     *
     * <hz>: frequency in hz (0 - sampleRate/2)
     */
    this.getFrequencyBin = function(hz) {
        var nyquist = audioContext.sampleRate/2;
        var bin = Math.round(hz * analyser.frequencyBinCount / nyquist);
        return bin;
    };

    /* BeatCounter
     *
     * Constructor function for a BeatCounter object.
     *
     * <cooldown>: minimum time in milliseconds between consecutive beats (0 - Infinity) [default: 50]
     * <memory>: size of history buffer (0 - Infinity) [default: 50]
     * <tolerance>: maximum tolerance (in ms) when matching hits to the beat (0 - Infinity) [default: 50]
     *
     * Example Usage:
     *    this.beat = this.beat || new Music.BeatCounter();
     *    this.beat.countIf(peak > 0.1);
     *    if (this.beat.on(4)) {
     *        // do something every 4th beat
     *    }
     */
    this.BeatCounter = function(cooldown, memory, tolerance) {
        cooldown = (cooldown != null ? cooldown : 100);
        memory = (memory != null ? memory : 50);
        tolerance = (tolerance != null ? tolerance : 60);

        this.count = 0;
        this.isHit = false;
        this.isBeat = false;
        this.bpm = 0;
        this.confidence = 0;
        this.prevHit = performance.now();
        this.nextBeat = 0;
        this.offBeatCount = 0;
        this.maxOffBeats = 16;

        var bpmHistory = [];

        this.calcBpm = function() {
            var i, bin, bpm, bestBin;
            var bpmBins = {};
            var binSize = 1;
            var count = 0;
            var bestCount = 0;
            var totalCount = 0;
            var bestBpms = [];
            // put history into bins
            for (i=0; i<bpmHistory.length; i++) {
                bpm = bpmHistory[i];
                bin = Math.round(bpm/binSize);
                if (bpmBins[bin] == null) {
                    bpmBins[bin] = [];
                }
                bpmBins[bin].push(bpm);
            }

            // count bins
            for (bin in bpmBins) {
                bin = parseInt(bin,10);
                count = bpmBins[bin].length 
                      + (bpmBins[bin*2] || []).length 
                      + (bpmBins[bin*4] || []).length
                      + (bpmBins[Math.round(bin/2)] || []).length
                      + (bpmBins[Math.round(bin/4)] || []).length;
                // multiply by gaussian to discourage extremely high (and low) bpm
                //count = Math.round(count * Math.exp(-Math.pow((bin*binSize-80)/60,2)));
                totalCount += count;
                if (count > bestCount) {
                    bestCount = count;
                    bestBin = bin;
                }
            }
            // take bpm from best bins
            for (i=-binSize; i<=binSize; i+=binSize) {
                if (bpmBins[bestBin+i]) {
                    Array.prototype.push.apply(bestBpms, bpmBins[bestBin+i]);
                }
                if (bpmBins[bestBin*2+i]) {
                    Array.prototype.push.apply(bestBpms, bpmBins[bestBin*2+i].map(function(x){return x/2;}));
                }
                if (bpmBins[bestBin*4+i]) {
                    Array.prototype.push.apply(bestBpms, bpmBins[bestBin*4+i].map(function(x){return x/4;}));
                }
                if (bpmBins[Math.round(bestBin/2)+i]) {
                    Array.prototype.push.apply(bestBpms, bpmBins[Math.round(bestBin/2)+i].map(function(x){return x*2;}));
                }
                if (bpmBins[Math.round(bestBin/4)+i]) {
                    Array.prototype.push.apply(bestBpms, bpmBins[Math.round(bestBin/4)+i].map(function(x){return x*4;}));
                }
            }
            // median of best bpms
            len = bestBpms.length;
            if (len === 0) {
                this.bpm = 0;
            } else {
                bestBpms.sort(function(a,b){return a-b;});
                if (len%2 === 1) {
                    this.bpm = bestBpms[Math.floor(len/2)];
                } else {
                    this.bpm = ( bestBpms[Math.floor(len/2)]
                               + bestBpms[Math.ceil(len/2)] ) / 2;
                }
            }
        };

        this.update = function(rise) {
            if (rise > 0.25) {
                if (!this.wait) {
                    this.wait = true;
                    return this.countIf(true);
                }
            } else if (rise < 0.1) {
                this.wait = false;
            }
            return this.countIf(false);
        };
        this.countIf = function(isHit) {
            var now, dt, nowBpm;
            this.isHit = isHit;
            this.isBeat = false;
            now = performance.now();
            dt = now - this.prevHit;
            if (dt > cooldown && isHit) {
                // get "bpm" based on time between previous hit and this one
                nowBpm = 60 * 1000 / dt;
                this.prevHit = now;

                // record current bpm in history
                bpmHistory.push(nowBpm);
                if (bpmHistory.length > memory) {
                    bpmHistory.shift();
                }
                this.calcBpm();
                if(Math.abs(60*1000/nowBpm - 60*1000/this.bpm) <= tolerance
                || Math.abs(60*1000/nowBpm - 60*1000/this.bpm*2) <= tolerance
                || Math.abs(60*1000/nowBpm - 60*1000/this.bpm/2) <= tolerance) {
                    if (now >= this.nextBeat-tolerance) {
                        this.isBeat = true;
                        this.count += 1;
                        this.offBeatCount = 0;
                        this.confidence = Math.min(1, this.confidence + 0.1);
                    }
                    this.nextBeat = now + 60 * 1000 / this.bpm;
                }

            } else {
                this.isHit = false;
                // off beats
                if (now > this.nextBeat) {
                    this.confidence = Math.max(0, this.confidence - 0.1);
                    this.nextBeat = now + 60 * 1000 / this.bpm;
                    if (this.confidence > 0) {
                        this.isBeat = true;
                        this.count += 1;
                        this.offBeatCount += 1;
                    }
                }
            }
            return this.isBeat;
        };

        this.on = function(modulo, remainder) {
            modulo = modulo || 1;
            remainder = remainder || 0;
            if (this.isBeat && this.count % modulo === remainder) {
                return true;
            }
            return false;
        };
    };
    
    return this;
}
/*********************** UNIT TESTS ***********************/
var Draw = include('Utilities/Drawing');

ctx.lineWidth = 4;
ctx.strokeStyle = 'white';
ctx.font = '12px sans-serif';
this.config(1024,0.8);
this.cursor = (this.cursor+5)%640 || 0;

var plotArray = function(array,label,y) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0,y,ctx.canvas.width,100);
    ctx.fillStyle = 'white';
    ctx.fillText(label,0,y+15);
    for (var i=0; i<array.length; i++) {
        ctx.beginPath();
        ctx.moveTo(5*i+2,y+20);
        ctx.lineTo(5*i+2,y+20+70*array[i]);
        ctx.stroke();
    }
};
var plotValue = function(value,label,x,y) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0,y,ctx.canvas.width,20);
    ctx.fillRect(x,y,5,100);
    ctx.fillStyle = 'white';
    ctx.fillText(label,0,y+15);
    ctx.beginPath();
    ctx.moveTo(x,y+20);
    ctx.lineTo(x,y+20+value*70);
    ctx.stroke();
};

// getWaveformData
var wave = this.getWaveformData();
plotArray(wave,'getWaveformData',0);

// getFrequencyData
var freq = this.getFrequencyData();
plotArray(freq,'getFrequencyData',100);

// getPeakData
var peak = this.getPeakData(freq);
plotArray(peak,'getPeakData',200);

// getToneData
var tone = this.getToneData(freq);
plotArray(tone,'getToneData',300);

// getPctPeaks
var pctPeaks = this.getPctPeaks(freq);
plotValue(pctPeaks,'getPctPeaks',this.cursor,400);

//pctRisingPeaks
var pctRisingPeaks = this.getPctRisingPeaks();
plotValue(pctRisingPeaks,'getPctRisingPeaks',this.cursor,500);

// BeatCounter
this.beat = this.beat || new this.BeatCounter();
this.beat.countIf(pctRisingPeaks > 0.25);
//this.beat.update(pctRisingPeaks);
plotValue(this.beat.on(1) && this.beat.isHit ? 1 : this.beat.on(1) ? 0.5 : 0,
          'BeatCounter ' + this.beat.count + 
          '  BPM: ' + this.beat.bpm.toFixed(2) + 
          '  Confidence: ' + this.beat.confidence.toFixed(2),
          this.cursor,600);
plotValue(this.beat.isHit ? 1 : 0, 'Hits', this.cursor,700);

ctx.fillStyle = 'white';

},

/***************************************************************/
"Utilities/Transform":function(ctx, analyser, audioContext, include) {
/* Transform
 *
 * A collection of utility functions for manipulating the transform matrix
 * or transforming the current image by redrawing it with a different matrix.
 *
 * Example usage:
 *    include('Utilities/Transform');
 *    this.zoom(1.1);
 */


/* These functions are replacements for the same functions on ctx object
 * Use these instead so we can keep track of the transform matrix
 *
 */
this.currentTransform = [1,0,0,1,0,0];
this.transformStack = [];
this.setTransform = function(a,b,c,d,e,f) {
    this.currentTransform = [a,b,c,d,e,f];
    ctx.setTransform(a,b,c,d,e,f);
};
this.transform = function(a,b,c,d,e,f) {
    var a0 = this.currentTransform[0];
    var b0 = this.currentTransform[1];
    var c0 = this.currentTransform[2];
    var d0 = this.currentTransform[3];
    var e0 = this.currentTransform[4];
    var f0 = this.currentTransform[5];
    this.currentTransform = [
        a0*a + c0*b,
        b0*a + d0*b,
        a0*c + c0*d,
        b0*c + d0*d,
        a0*e + c0*f + e0,
        b0*e + d0*f + f0
    ];
    ctx.setTransform.apply(ctx,this.currentTransform);
};
this.translate = function (x,y) {
    this.transform(1,0,0,1,x,y);
};
this.rotate = function(angle) {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    this.transform(cos, sin, -sin, cos, 0, 0);
};
this.scale = function(x,y) {
    this.transform(x,0,0,y,0,0);
};
this.save = function() {
    this.transformStack.push(this.currentTransform);
    ctx.save();
};
this.restore = function() {
    this.currentTransform = this.transformStack.pop();
    ctx.restore();
};
/* End ctx.transform replacement*/



// use an oversized offscreen canvas to avoid screen edge artifacts
var fullCanvas,
    fullCtx,
    screenCtx = ctx,
    offsetX = 0,
    offsetY = 0;
this.useOversizedCanvas = function() {
    var w,h,size;
    w = screenCtx.canvas.width;
    h = screenCtx.canvas.height;
    size = Math.ceil(Math.sqrt(w*w + h*h));
    offsetX = Math.floor((size - w) / 2);
    offsetY = Math.floor((size - h) / 2);
    if (!fullCanvas) {
        fullCanvas = document.createElement('canvas');
        fullCtx = fullCanvas.getContext('2d');
    }
    if (size !== fullCanvas.width || size !== fullCanvas.height) {
        fullCanvas.width = size;
        fullCanvas.height = size;
    }
    this.setTransform(1,0,0,1,offsetX, offsetY);
    screenCtx.setTransform(1,0,0,1,-offsetX,-offsetY);
    screenCtx.drawImage(fullCanvas,0,0);
    ctx = fullCtx;
    return fullCtx;
};


this.center = function(x,y) {
    x = (x != null ? x : ctx.canvas.width/2);
    y = (y != null ? y : ctx.canvas.height/2);
    this.setTransform(1,0,0,1,x,y);
};

/* The following functions copy the image after applying a transformation
 * to create motion effects across multiple frames
 */

this.zoom = function(amount) {
    this.save();
    this.setTransform(amount,0,0,amount, ctx.canvas.width/2, ctx.canvas.height/2);
    this.translate(-ctx.canvas.width/2,-ctx.canvas.height/2);
    ctx.drawImage(ctx.canvas, 0, 0);
    this.restore();
};

this.spin = function(angle) {
    var cos = Math.cos(-angle);
    var sin = Math.sin(-angle);
    this.save();
    this.setTransform(cos, sin, -sin, cos, ctx.canvas.width/2, ctx.canvas.height/2);
    this.translate(-ctx.canvas.width/2, -ctx.canvas.height/2);
    ctx.drawImage(ctx.canvas, 0, 0);
    this.restore();
};

this.shift = function(x, y) {
    this.save();
    this.setTransform(1,0,0,1,x,y);
    ctx.drawImage(ctx.canvas, 0, 0);
    this.restore();
};

this.mirror = function(x,y,dir,clip) {
    var w,h;
    w = ctx.canvas.width;
    h = ctx.canvas.height;
    x = (x != null ? x : w/2);
    y = (y != null ? y : h/2);
    dir = (dir != null ? dir : 0);
    clip = (clip != null ? clip : true);
    
    var xOff = this.currentTransform[4],
        yOff = this.currentTransform[5];
    
    this.save();
    
    // rotate
    this.translate(x,y);
    this.rotate(dir);
    
    // set clipping region
    if (clip) {
        ctx.beginPath();
        ctx.rect(0,-h,w,h*2);
        ctx.clip();
    }
    // flip image
    this.scale(-1,1);
    
    // undo rotation
    this.rotate(-dir);
    this.translate(-x,-y);
    
    // copy canvas
    ctx.drawImage(ctx.canvas, -xOff, -yOff);
    this.restore();
};

this.kaleidoscope = function(options) {
    var angle,theta,sin,cos;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var defaults = {
        slices: 8,
        x: w/2,
        y: h/2,
        rotation:0,
        clipRadius: Math.sqrt(w*w + h*h),
        clipCircle: false,
        debug: false
    };
    options = options || {};
    Object.keys(defaults).map(function(key) { 
        options[key] = (key in options) ? options[key] : defaults[key]; 
    });
    
    slices = options.slices;
    x = options.x;
    y = options.y;
    rotation = options.rotation;
    clipCircle = options.clipCircle;
    clipRadius = options.clipRadius;
    var a = Math.PI/slices;
    for(var s=1; s<slices; s+=2) {
        this.mirror(x, y, Math.PI/2 + rotation + s*a, true);
    }
};


this.kaleidoscope_old = function(options) {
    var angle,theta,sin,cos;
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var defaults = {
        slices: 8,
        x: w/2,
        y: h/2,
        rotation:0,
        clipRadius: Math.sqrt(w*w + h*h),
        clipCircle: false,
        debug: false
    };
    options = options || {};
    Object.keys(defaults).map(function(key) { 
        options[key] = (key in options) ? options[key] : defaults[key]; 
    });
    
    slices = options.slices;
    x = options.x;
    y = options.y;
    rotation = options.rotation;
    clipCircle = options.clipCircle;
    clipRadius = options.clipRadius;
    
    var xOff = this.currentTransform[4],
        yOff = this.currentTransform[5];
    
    theta = 2*Math.PI/slices;
    sin = Math.sin(theta);
    cos = Math.cos(theta);
    for (i = 1; i< slices; i++) {
        angle = i*theta;
        this.save();
        this.translate(x, y);
        this.rotate(rotation+angle);
        
        // set clipping region to a pie slice
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(clipRadius, 0);
        if (clipCircle) {
            ctx.arc(0,0, clipRadius, 0,theta);
        } else {
            ctx.lineTo(cos*clipRadius, sin*clipRadius);
        }
        ctx.closePath();
        ctx.clip();
        
        // mirror every other slice
        if (i%2 === 1) {
            this.rotate(theta/2 + Math.PI/2);
            this.scale(-1,1);
            this.rotate(-(theta/2 + Math.PI/2));
        }
        
        this.rotate(-rotation);
        this.translate(-x,-y);
        // copy canvas
        ctx.drawImage(ctx.canvas, -xOff, -yOff);
        this.restore();
    }
    
    if (options.debug) {
        this.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'white';
        this.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(0,0);
        //ctx.lineTo(Math.min(w-x,clipRadius), 0);
        ctx.lineTo(clipRadius, 0);
        if (clipCircle) {
            ctx.arc(0,0, clipRadius, 0,theta);
        } else {
            //ctx.lineTo(Math.min(w-x,cos*clipRadius), Math.min(h-y,sin*clipRadius));
            ctx.lineTo(cos*clipRadius, sin*clipRadius);
        }
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = 'hsla(0,0%,100%,0.2)';
        //ctx.fill();
        ctx.stroke();
        this.translate(-x, -y);
        ctx.rect(0,0,w,h);
        ctx.stroke();
        this.restore();
    }
};

return this;
}
}
