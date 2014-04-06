function Trip() {
    var audioContext, source, analyser, playing, startTime, playTime, $playlist, $song, filesToAdd, autoId, g_files,
        canvas, ctx, width, height, frame, animId, editor, scriptName, dynamicCode;
    
    function init() {
        initApi();
        initCode();
        $playlist = $('#playlist tbody');
        frame = 0;
        autoId = 0;
        canvas = document.createElement('canvas');
        $('#vis').append(canvas);
        ctx = canvas.getContext('2d');
        resize();
        
        // hook up events
        $(window).on('resize', resize);
        $('#browse').on('click', function() { $('#file').click(); });
        $('#file').on('change', onFileChange);
        $('#clear').on('click', clearPlaylist);
        $('#pause').on('click', pause);
        $('#next').on('click', next);
        $('#toggle').on('click', toggleControls);
        $('.tab').on('click', changeTab);
        $('#save').on('click', saveScript);
        $('#delete').on('click', deleteScript);
        $('#scripts').on('change', onScriptChange);
        $('#playlist>tbody').on('click','tr', changeSong);
        $('#playlist>tbody').on('dragstart', 'tr', onDragStart);
        $('#playlist>tbody').on('dragenter', 'tr', onDragEnter);
        $('#playlist>tbody').on('dragover', 'tr', onDragOver);
        $('#playlist>tbody').on('dragleave', 'tr', onDragLeave);
        $('#playlist>tbody').on('drop', 'tr', onDrop);
        $('#music').on('dragover', onDragOver);
        $('#music').on('drop', onDrop);
    }
    function resize() {
        width = canvas.parentNode.clientWidth;
        height = canvas.parentNode.clientHeight;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = 'black';
        ctx.fillRect(0,0,width,height);
        ctx.setTransform(1,0,0,1,width/2,height/2); // center coordinate system
    }
    function initApi() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        audioContext = new AudioContext();
    }
    function initCode() {
        dynamicCode = {};
        
        // create code editor
        editor = CodeMirror($('#editor')[0], {
            theme: 'trip',
            lineNumbers: true,
            indentUnit: 4,
            indentWithTabs: false,
            highlightSelectionMatches: true,
            matchBrackets: true,
            //styleActiveLine: true,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                'Tab': function(cm) {
                    if (cm.getSelection().length > 0) {
                        CodeMirror.commands.indentMore(cm);
                    } else {
                        var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                        cm.replaceSelection(spaces);
                    }
                },
                'Shift-Tab': function(cm) {
                    CodeMirror.commands.indentLess(cm);
                },
                'Ctrl-Space': 'autocomplete',
                'Ctrl-S': function(cm) {
                    saveScript();
                }
            }
        });
        scriptName = localStorage['recent'];
        listScripts();
        loadScript(scriptName);
    }
    function listScripts() {
        var $select = $("#scripts");
        $select.empty();
        for (var key in localStorage) {
            if (key.substr(0,7) === 'script_') {
                $select.append($('<option>'+key.substr(7)+'</option>'));
            }
        }
        $select.append($('<option value="">(new script)</option>'));
        $select.val(scriptName);
        localStorage['recent'] = scriptName;
    }
    function onScriptChange(e) {
        loadScript(this.value);
    }
    function loadScript(name) {
        var script;
        if (name) {
            script = localStorage.getItem('script_' + name);
        }
        if (script == null) {
            name = '';
            script = defaultScript.toString();
            script = script.slice(script.indexOf("{") + 1, script.lastIndexOf("}"));
        }
        scriptName = name;
        localStorage['recent'] = scriptName;
        editor.setValue(script);
        CodeMirror.commands.selectAll(editor);
        CodeMirror.commands.indentAuto(editor);
        editor.getDoc().setSelection({line: 0, ch:0});
        dynamicCode.main = new Function(getParamNames(defaultScript), script);
    }
    function saveScript() {
        var script = editor.getValue();
        if (!scriptName) {
            scriptName = prompt('Enter a name for your script:');
            if (!scriptName) {
                return; // cancel
            }
        }
        localStorage.setItem('script_' + scriptName, script);
        localStorage['recent'] = scriptName;
        dynamicCode.main = new Function(getParamNames(defaultScript), script);
        listScripts();
        resetVis();
    }
    function deleteScript() {
        if (scriptName) {
            localStorage.removeItem('script_' + scriptName);
            scriptName = null;
            listScripts();
        }
    }
    function getParamNames(func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var funcString = func.toString().replace(STRIP_COMMENTS, '');
        var params = funcString.slice(funcString.indexOf('(')+1, funcString.indexOf(')')).match(/([^\s,]+)/g);
        return params || [];
    }
    function toggleControls(e) {
        var $ctrl = $('#controls');
        var $vis = $('#vis');
        var toggle = this;
        var hidden = function() {
            toggle.innerHTML = '&#9668;';
            $vis.css('width','100%');
            resize();
        }
        var visible = function() {
            toggle.innerHTML = '&#9658;';
            $vis.css('width','50%');
            resize();
        }
        if (parseInt($ctrl.css('marginLeft')) === 0) {
            $ctrl.animate({ marginLeft: $ctrl.outerWidth() },{complete:hidden});
            $vis.animate({ width: '100%' });
        } else {
            $ctrl.animate({ marginLeft: 0 },{complete:visible});
            $vis.animate({ width: '50%' });
        }
    }
    function changeTab(e) {
        var $this = $(this);
        var $panel = $($this.data('panel'));
        $('.tab').removeClass('active');
        $this.addClass('active');
        $('.panel').hide();
        $panel.show();
    }
    function onDragStart(e) {
        e.originalEvent.dataTransfer.setData('song', this.id);
        e.originalEvent.effectAllowed = 'move';
        $(this).addClass('dragging');
    }
    function onDragEnter(e) {
        // noop
    }
    function onDragOver(e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';
        if (e.originalEvent.dataTransfer.getData('song')) {
            movePlaylistRow(e);
        }
    }
    function onDragLeave(e) {
        // noop
    }
    function onDrop(e) {
        e.preventDefault();
        if (e.originalEvent.dataTransfer.files.length > 0) {
            addFiles(e.originalEvent.dataTransfer.files);
        } else {
            movePlaylistRow(e);
            $('#' + e.originalEvent.dataTransfer.getData('song')).removeClass('dragging');
        }
    }
    function movePlaylistRow(e) {
        var $target = $(e.target);
        var id = e.originalEvent.dataTransfer.getData('song');
        var $tbody = $target.closest('tbody');
        if ($tbody.length > 0) {
            $target.closest('tr').before($('#'+id));
        } else {
            var top = $target.closest('thead').length > 0 || $target.closest('#playback').length > 0;
            if (top) {
                $playlist.children().first().before($('#'+id));
            } else {
                $playlist.children().last().after($('#'+id));
            }
        }
    }
    function onFileChange(e) {
        $this = $(this);
        if (e.currentTarget.files.length > 0) {
            addFiles(e.currentTarget.files);
        }
        $this.wrap('<form>').closest('form').get(0).reset();
        $this.unwrap();
    }
    function addFiles(files) {
        $.each(files, function(i, file) {
            createPlaylistRow(file);
            ID3.loadTags(file.name, function() {
                file.tags = ID3.getAllTags(file.name);
                updatePlaylistRow(file);
            },{
                dataReader: FileAPIReader(file),
                tags: ["title", "artist", "album", "year", "track"]
            });
        });
    }
    function createPlaylistRow(file) {
        var $item;
        file.id = (autoId++);
        $item = $('<tr draggable="true" id="song' + file.id + '">'
                + createPlaylistRowCells(file)
                + '</tr>');
        $item.data('file',file);
        $playlist.append($item);
    }
    function createPlaylistRowCells(file) {
        var tags = file.tags || { artist:'', album:'', year:'', title:file.name, track:'0' };
        var index = '<td class="num index"></td>';
        var artist = '<td class="artist">' + tags.artist + '</td>';
        var album =  '<td class="album">' + tags.album + ' (' + tags.year + ')</td>';
        var title =  '<td class="title">' + tags.title + '</td>';
        var track =  '<td class="track num">' + tags.track + '.</td>';
        return index + artist + album + track + title;
    }
    function updatePlaylistRow(file) {
        $('#song' + file.id).html(createPlaylistRowCells(file));
    }
    function clearPlaylist() {
        if (playing) {
            playing = false;
            source.stop();
        }
        $playlist.empty();
    }
    function changeSong(e) {
        e.preventDefault();
        e.stopPropagation();
        if (playing) {
            playing = false;
            source.stop();
            $song.removeClass('playing');
        }
        $song = $(this);
        openFile($song.data('file'));
        return false;
    }
    function openFile(filename) {
        var fr = new FileReader();
        fr.onload = onFileLoad;
        // fr.onerror = onFileError;
        fr.readAsArrayBuffer(filename);
        $song.addClass('playing');
    }
    function onFileLoad(e) {
        var file = e.target.result;
        playTime = 0;
        audioContext.decodeAudioData(file, play);
    }
    function onFileError(e) {
        // noop
    }
    function onAudioEnd() {
        if (playing) {
            playing = false;
            $song.removeClass('playing');
            $song = $song.next();
            if ($song) {
                openFile($song.data('file'));
            }
        }
    }
    function next(e) {
        source.stop();
    }
    function pause(e) {
        if (playing) {
            playing = false;
            source.stop();
            playTime += audioContext.currentTime - startTime;
            stopVis();
            e.currentTarget.innerHTML = 'Resume';
        } else {
            play(source.buffer);
            e.currentTarget.innerHTML = 'Pause';
        }
        console.log(playTime);
    }
    function resume() {
        var buffer = source.buffer;
        source = audioContext.createBufferSource();
        source.onended = onAudioEnd;
        source.connect(audioContext.destination);
        source.connect(analyser);
        source.buffer = buffer;
        source.start(0, pauseTime);
        startTime = audioContext.currentTime;
        playTime = 0;
        playing = true;
        startVis();
        
    }
    function play(buffer) {
        // Analyser
        analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.2;
        analyser.fftSize = 512;
        
        // Source
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.onended = onAudioEnd;
        source.connect(audioContext.destination);
        source.connect(analyser);
        source.start(0, playTime);
        
        startTime = audioContext.currentTime;
        playing = true;
        startVis();
    }
    function startVis() {
        animId = requestAnimationFrame(tick);
    }
    function resetVis() {
        if (animId) {
            cancelAnimationFrame(animId);
            startVis();
        }
    }
    function stopVis() {
        if (animId) {
            cancelAnimationFrame(animId);
        }
    }
    function getFrequencyData(analyser) {
        //var freq = new Uint8Array(analyser.frequencyBinCount);
        //analyser.getByteFrequencyData(freq);
        var freq = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(freq);
        var array = Array.apply([], freq);
        return array.map(function(x) {
            var normalized = (x - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels);
            if (normalized < 0) {
                normalized = 0;
            } else if (normalized > 1) {
                normalized = 1;
            }
            return normalized;
        });
    }
    function getWaveformData(analyser) {
        var wave = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(wave);
        return Array.apply([], wave);
    }
    function tick() {
        frame += 1;
        var frequency = getFrequencyData(analyser);
        var waveform = getWaveformData(analyser);
        dynamicCode.main(ctx, frame, width, height, frequency, waveform);
        startVis();
    }
    function defaultScript(ctx, frame, width, height, frequency, waveform) {
        /* Pre-Defined Variables:
         * ctx: 2D drawing context
         * frame: current frame number
         * width: width of the drawing canvas
         * height: height of the drawing canvas
         * frequency: array of frequency data
         * waveform: array of waveform data
         */
        function drawCircle(r) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, 2*Math.PI);
            ctx.stroke();
        }
        function drawRay(r) {
            ctx.beginPath();
            ctx.moveTo(0,0);
            var angle = frame % (2*Math.PI);
            ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            ctx.stroke();
        }
        function drawPolygon(rArray, ccw) {
            var angle, x, y;
            ctx.beginPath();
            for (var i = 0; i < rArray.length; i++) {
                angle = (Math.PI/2) + 2 * Math.PI * i / rArray.length;
                if (ccw) {
                    angle = 2 * Math.PI - angle;
                }
                x = rArray[i] * Math.cos(angle);
                y = rArray[i] * Math.sin(angle);
                if (i===0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        function radialSpectrum(data) {
            var data2 = data.slice(0, data.length);
            data2.reverse();
            data2.push.apply(data2,data);
            drawPolygon(data2);
        }

        var scale = Math.min(width,height)/2;
        var scaledF = frequency.map(function(x) { return x * scale; });

        var vol = scaledF.reduce(function(sum, x) { return sum+x; }, 0) / scaledF.length;
        var speed = 1 + frequency[16]/100;
        var hue = Math.floor(256 - frequency[0]*256);
        var bass = scaledF.slice(0,32);
        var mid = scaledF.slice(32,128);

        // zooming effect
        ctx.save();
        ctx.setTransform(speed,0,0,speed, width/2, height/2);
        ctx.translate(-width/2,-height/2);
        ctx.drawImage(ctx.canvas, 0, 0);
        ctx.restore();

        // outer butterflies
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'hsl(' + hue + ',100%,50%)';
        radialSpectrum(bass);

        // treble circles
        ctx.lineWidth = 10;
        ctx.strokeStyle = 'hsla(' + hue + ',100%,50%,0.5)';
        drawCircle(scaledF[200]);

        // inner burst of color
        ctx.strokeStyle = 'hsla(' + (frame + 128) % 256 + ',100%,50%,0.2)';
        radialSpectrum(mid);
    }
    init();
}