function Trip() {
    var STOPPED = 0,
        PAUSED = 1,
        LOADING = 2,
        PLAYING = 3;
    var audioContext, fileReader, source, analyser, status, startTime, playTime, $playlist, $song, filesToAdd, autoId, g_files,
        canvas, ctx, width, height, frame, animId, editor, scriptName, dynamicCodeContext, dynamicCodeScripts, dirty;
    
    function init() {
        initApi();
        initCodeEditor();
        $playlist = $('#playlist tbody');
        frame = 0;
        autoId = 0;
        canvas = document.createElement('canvas');
        $('#vis').append(canvas);
        ctx = canvas.getContext('2d');
        resize();
        
        $('#scripts').on('click', toggleScriptList);
        
        // events
        $(window).on('resize', resize);
        $('#browse').on('click', function() { $('#file').click(); });
        $('#file').on('change', onFileChange);
        $('#clear').on('click', clearPlaylist);
        $('#pause').on('click', pause);
        $('#prev').on('click', prev);
        $('#next').on('click', next);
        $('#toggle').on('click', toggleControls);
        $('.tab').on('click', changeTab);
        //$('#scripts').on('change', onScriptChange);
        $('#save').on('click', onSaveClick);
        $('#saveas').on('click', onSaveAsClick);
        $('#delete').on('click', deleteScript);
        $('#new').on('click', newScript);
        $('#playlist>tbody').on('click','.delete', onSongDelete);
        $('#playlist>tbody').on('click','tr', onSongClick);
        $('#playlist>tbody').on('dragstart', 'tr', onDragStart);
        $('#playlist>tbody').on('dragenter', 'tr', onDragEnter);
        $('#playlist>tbody').on('dragover', 'tr', onDragOver);
        $('#playlist>tbody').on('dragleave', 'tr', onDragLeave);
        $('#playlist>tbody').on('drop', 'tr', onDrop);
        $('#music').on('dragover', onDragOver);
        $('#music').on('drop', onDrop);
        
        $('#tabMusic').click();
    }
    function resize() {
        width = canvas.parentNode.clientWidth;
        height = canvas.parentNode.clientHeight;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = 'black';
        ctx.fillRect(0,0,width,height);
        //ctx.setTransform(1,0,0,1,width/2,height/2); // center coordinate system
    }
    function initApi() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
        audioContext = new AudioContext();
    }
    function initCodeEditor() {
        editor = CodeMirror($('#editor')[0], {
            theme: 'trip',
            lineNumbers: true,
            indentUnit: 4,
            indentWithTabs: false,
            highlightSelectionMatches: true,
            matchBrackets: true,
            lint: {
                options: {
                    eqnull: true,
                    laxbreak: true,
                    laxcomma: true,
                    sub: true
                }
            },
            //styleActiveLine: true,
            foldGutter: true,
            gutters: ["CodeMirror-lint-markers","CodeMirror-linenumbers", "CodeMirror-foldgutter"],
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
                    onSaveClick();
                }
            }
        });
        scriptName = localStorage['recent'];
        refreshScriptList();
        loadScript(scriptName);
    }
    function toggleScriptList(e) {
        $('#script-list').toggle();
        $('#script-list-close').toggle();
    }
    function hideScriptList() {
        $('#script-list').hide();
        $('#script-list-close').hide();
    }
    function showScriptList() {
        $('#script-list').show();
        $('#script-list-close').show();
    }
    function refreshScriptList() {
        var $list, $ul, $li, groups, group, groupName, name, path, originalName, width;
        originalName = scriptName; // need to change this repeatedly for width calculation
        $('#scripts').outerWidth('auto');
        $list = $('<div id="script-list"></div>');
        groups = buildScriptGroups();
        width = 0;
        for (groupName in groups) {
            group = groups[groupName];
            if(groupName.length > 0) {
                $list.append($('<div class="script-group-heading">'+groupName+'</div>'));
                $ul = $('<ul class="script-group"></ul>');
            } else {
                $ul = $('<ul class="script-root"></ul>');
            }
            for (name in group) {
                path = group[name];
                $li = $('<li><a data-script-name="'+path+'">'+name+'</a></li>');
                $ul.append($li);
                setCurrentScriptName(path);
                width = Math.max(width, $('#scripts').outerWidth());
            }
            $list.append($ul);
        }
        scriptName = originalName;
        $('#script-list-close').remove();
        $('#script-list').remove();
        $('#scripts').after($list);
        $('body').append($('<div id="script-list-close"></div>'));
        
        $('#script-list').outerWidth(width+'px');
        $('#scripts').outerWidth(width+'px');
        
        // events
        $('#script-list a').on('click', onScriptChange);
        $('#script-list-close').on('click', hideScriptList);
    }
    function buildScriptGroups() {
        var key, path, parts, name, group, groups;
        groups = {};
        for (key in localStorage) {
            if (key.substr(0,7) === 'script_') {
                path = key.substr(7);
                parts = splitScriptName(path);
                group = parts[0];
                name = parts[1];
                if (!(group in groups)) {
                    groups[group] = {};
                }
                groups[group][name] = path;
            }
        }
        return groups;
    }
    function splitScriptName(name) {
        var slash, group;
        slash = name.indexOf('/');
        if (slash >= 0) {
            group = name.substr(0,slash);
            name = name.substr(slash+1);
        } else {
            group = '';
        }
        return [group,name];
    }
    function onScriptChange(e) {
        hideScriptList();
        if (confirmUnsavedChanges()) {
            loadScript($(this).data('script-name'));
        }
    }
    function newScript() {
        if (confirmUnsavedChanges()) {
            loadScript('');
        }
    }
    function confirmUnsavedChanges() {
        if (editor.getValue() !== localStorage.getItem('script_' + scriptName)) {
            return confirm("Warning: Your changes have not been saved!\n\nDiscard changes?");
        }
        return true;
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
        setCurrentScriptName(name);
        editor.setValue(script);
        CodeMirror.commands.selectAll(editor);
        CodeMirror.commands.indentAuto(editor);
        editor.getDoc().setSelection({line: 0, ch:0});
        resetScriptContext();
        registerScript(scriptName, script);
    }
    function onSaveAsClick() {
        var name = prompt('Enter a name for your script:');
        if (!name) {
            return; // cancel
        }
        setCurrentScriptName(name);
        saveCurrentScript(name);
        refreshScriptList();
    }
    function onSaveClick() {
        if (scriptName) {
            saveCurrentScript(scriptName);
        } else {
            onSaveAsClick();
        }
    }
    function saveCurrentScript(name) {
        var script = editor.getValue();
        localStorage.setItem('script_' + scriptName, script);
        resetScriptContext();
        registerScript(scriptName, script)
    }
    function deleteScript() {
        if (scriptName) {
            localStorage.removeItem('script_' + scriptName);
            setCurrentScriptName('');
            refreshScriptList();
        }
    }
    function setCurrentScriptName(name) {
        var parts, group;
        scriptName = name;
        localStorage['recent'] = scriptName;
        if (name != null && name.length > 0) {
            parts = splitScriptName(name);
            group = parts[0];
            name = parts[1];
            if (group.length > 0) { group += ' / '; }
            $('#scripts').html('<span class="group">'+group+'</span>'+name);
        } else {
            $('#scripts').text('(untitled)');
        }
    }
    function resetScriptContext() {
        dynamicCodeContext = {};
        dynamicCodeScripts = {};
        dynamicCodeIncludes = {};
        if (ctx) {
            ctx.setTransform(1,0,0,1,0,0);
            resize();
        }
    }
    function registerScript(name, script) {
        // Syntax check
        JSHINT(script);
        for (var i=0; i<JSHINT.errors.length; i++) {
            var err = JSHINT.errors[i];
            if (err.code[0] === 'E') {
                err.script = name;
                showError(err);
                return null;
            }
        }
        // Register the function
        var func = new Function(getParamNames(defaultScript), script);
        dynamicCodeScripts[name] = func;
        clearError();
        return func;
    }
    function showError(err) {
        if (err.reason) { // JSHINT
            var errStr = 'Error: ' + err.reason + ' [' + err.script;
            if (err.line != null) {
                errStr += ': line ' + err.line;
            }
            errStr += ']';
            //console.log(err.reason, err.script, err.line, err.character);
        } else { // Runtime exception
            var errStr = 'Error: ' + err.message;
            //console.log(err.message, err.stack);
        }
        $('#error').text(errStr).show();
        
    }
    function clearError() {
        $('#error').empty().hide();
    }
    function showStatus(msg) {
        $('#status').text(msg).show();
    }
    function clearStatus() {
        $('#status').empty().hide();
    }
    function checkScriptSyntaxMessy(script, success, error) {
        // this ugly function is necessary because javascript does not give you a line number
        // for syntax errors in eval()ed code. so we do syntax check using a DOM script element.
        var syntaxError = null;
        var previousErrorHandler = window.onerror;
        var el = document.createElement('script');
        el.type = 'text/javascript';
        el.innerHTML = '(function(){\n' + script + '});'; // wrap in a function so it doesn't execute
        window.onerror = function(msg,uri,line,col) {
            syntaxError = {
                message: msg,
                lineNumber: line-1,
                columnNumber: col
            }
            error(syntaxError);
            document.body.removeChild(el);
            return true;
        };
        el.onload = function() {
            window.onerror = previousErrorHandler;
            if(!syntaxError) {
                success();
            }
            document.body.removeChild(el);
        };
        document.body.appendChild(el);
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
        var $toggle = $(this);
        var hidden = function() {
            $toggle.empty().append($('<i class="fa fa-chevron-left"></i>'));
            $vis.css('width','100%');
            resize();
        }
        var visible = function() {
            $toggle.empty().append($('<i class="fa fa-chevron-right"></i>'));
            $vis.css('width','50%');
            resize();
        }
        if (parseInt($ctrl.css('marginLeft')) === 0) {
            $ctrl.animate({ marginLeft: $ctrl.outerWidth() },{duration:200,complete:hidden});
            $vis.animate({ width: '100%' },{duration:200});
        } else {
            $ctrl.animate({ marginLeft: 0 },{duration:200,complete:visible});
            $vis.animate({ width: '50%' },{duration:200});
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
        var albumText = tags.album ? tags.album + ' (' + tags.year + ')' : '';
        var album =  '<td class="album">' + albumText + '</td>';
        var title =  '<td class="title">' + tags.title + '</td>';
        var track =  '<td class="track num">' + parseInt(tags.track,10) + '.</td>';
        var remove = '<td class="delete num">&times;</td>' ;
        return index + artist + album + track + title + remove;
    }
    function updatePlaylistRow(file) {
        $('#song' + file.id).html(createPlaylistRowCells(file));
    }
    function clearPlaylist() {
        if (status === PLAYING) {
            status = STOPPED;
            source.stop();
            stopVis();
        }
        $playlist.empty();
    }
    function onSongDelete(e) {
        e.preventDefault();
        e.stopPropagation();
        var $row = $(this).closest('tr');
        if (status === PLAYING && $row[0].id === $song[0].id) {
            status = STOPPED;
            source.stop();
            stopVis();
        }
        $row.remove();
    }
    function onSongClick(e) {
        e.preventDefault();
        e.stopPropagation();
        changeSong($(this));
        return false;
    }
    function changeSong(newSong) {
        if (status === PLAYING) {
            status = STOPPED;
            source.stop();
            stopVis();
            $song.removeClass('playing');
        } else if (status === PAUSED) {
            $song.removeClass('playing');
            $('#pause').empty().html($('<i class="fa fa-pause"></i>'));
        } else if (status === LOADING) {
            fileReader.abort();
            $song.removeClass('playing');
        }
        $song = newSong;
        openFile($song.data('file'));
    }
    function openFile(filename) {
        fileReader = new FileReader();
        status = LOADING;
        showStatus("Loading file...");
        fileReader.onload = onFileLoad;
        fileReader.readAsArrayBuffer(filename);
        $song.addClass('playing');
    }
    function onFileLoad(e) {
        var file = e.target.result;
        playTime = 0;
        showStatus("Decoding audio data...");
        audioContext.decodeAudioData(file, play.bind(audioContext, $song));
    }
    function onFileError(e) {
        // noop
    }
    function onAudioEnd() {
        if (status === PLAYING) {
            status = STOPPED;
            stopVis();
            $song.removeClass('playing');
            $song = $song.next();
            if ($song.length > 0) {
                openFile($song.data('file'));
            }
        }
    }
    function prev(e) {
        changeSong($song.prev());
    }
    function next(e) {
        changeSong($song.next());
    }
    function pause(e) {
        if (status === PLAYING) {
            status = PAUSED;
            source.stop();
            stopVis();
            playTime += audioContext.currentTime - startTime;
            $(this).empty().html($('<i class="fa fa-play"></i>'));
        } else if (status === PAUSED) {
            play($song, source.buffer);
            $(this).empty().html($('<i class="fa fa-pause"></i>'));
        }
    }
    function play(decodedSong, buffer) {
        if (decodedSong !== $song) {
            // song was changed after we started loading it.
            return;
        }
        clearStatus();
        
        // Analyser
        if (analyser == null) {
            analyser = audioContext.createAnalyser();
        }
        
        // Source
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.onended = onAudioEnd;
        source.connect(audioContext.destination);
        source.connect(analyser);
        
        source.start(0, playTime);
        
        startTime = audioContext.currentTime;
        status = PLAYING;
        startVis();
    }
    function startVis() {
        animId = requestAnimationFrame(tick);
    }
    function stopVis() {
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
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
        var array = Array.apply([], wave);
        return array.map(function(x) {
            return x/256;
        });
    }
    function tick() {
        frame += 1;
        //var freq = getFrequencyData(analyser);
        //var wave = getWaveformData(analyser);
        var args = [ctx, analyser];
        var include = includeScript.bind(this, args);
        args.push(include);
        var func = dynamicCodeScripts[scriptName];
        if (func != null) {
            try {
                func.apply(dynamicCodeContext, args);
            } catch (ex) {
                showError({reason: ex.message, script: scriptName, line: ex.lineNumber});
            }
        }
        startVis();
    }
    function includeScript(args, name) {
        var func;
        if (name in dynamicCodeScripts) {
            //func = dynamicCodeScripts[name];
            //return; // only run once
            return dynamicCodeIncludes[name];
        } else {
            if ('script_' + name in localStorage) {
                var script = localStorage.getItem('script_' + name);
                func = registerScript(name, script);
            } else {
                showError({reason: 'Script not found: "' + name + '"', script: name});
                return;
            }
        }
        if (func != null) {
            var include = arguments.callee.bind(dynamicCodeContext, args);
            args.push(include);
            try {
                //func.apply(dynamicCodeContext, args);
                var constructor = func.bind.apply(func, [null].concat(args));
                dynamicCodeIncludes[name] = new constructor();
                return dynamicCodeIncludes[name];
            } catch (ex) {
                showError({reason: ex.message, script: name, line: ex.lineNumber});
            }
        }
    }
    function defaultScript(ctx, analyser, include) {
        function drawCircle(r) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, 2*pi);
            ctx.stroke();
        }
        function drawRay(r) {
            ctx.beginPath();
            ctx.moveTo(0,0);
            var angle = frame % (2*pi);
            ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            ctx.stroke();
        }
        function drawPolygon(rArray, ccw) {
            var angle, x, y;
            ctx.beginPath();
            for (var i = 0; i < rArray.length; i++) {
                angle = (pi/2) + 2 * pi * i / rArray.length;
                if (ccw) {
                    angle = 2 * pi - angle;
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
        var scaledF = freq.map(function(x) { return x * scale; });

        var vol = scaledF.reduce(function(sum, x) { return sum+x; }, 0) / scaledF.length;
        var speed = 1 + freq[16]/100;
        var hue = Math.floor(256 - freq[0]*256);
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