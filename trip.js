function Trip() {
    var STOPPED = 0,
        PAUSED = 1,
        LOADING = 2,
        PLAYING = 3;
    var audioContext, fileReader, source, analyser, status, startTime, playTime, $playlist, $song, autoId,
        canvas, ctx, width, height, frame, animId, editor, scriptName, dynamicCodeContext, dynamicCodeScripts, dynamicCodeIncludes;
    
    function init() {
        initStorage();
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
        $('#export').on('click', exportScriptsJson);
        $('#import-file').on('change', onImportFileChange);
        $('#import').on('click', function() { $('#import-file').click(); });
        $('#delete').on('click', deleteScript);
        $('#new').on('click', newScript);
        $('#playlist>thead td').on('click', onColumnClick);
        $('#playlist>tbody').on('click','.delete', onSongDelete);
        $('#playlist>tbody').on('click','tr', onSongClick);
        $('#playlist>tbody').on('dragstart', 'tr', onDragStart);
        $('#playlist>tbody').on('dragenter', 'tr', onDragEnter);
        $('#playlist>tbody').on('dragover', 'tr', onDragOver);
        $('#playlist>tbody').on('dragleave', 'tr', onDragLeave);
        $('#playlist>tbody').on('drop', 'tr', onDrop);
        $('#music').on('dragover', onDragOver);
        $('#music').on('drop', onDrop);
        $('#option-editor-fold').on('click', onOptionEditorFold);
        $('#option-editor-lint').on('click', onOptionEditorLint);
        
        // load options from localstorage
        $('#option-editor-fold').prop('checked', localStorage['option-editor-fold'] == 'enabled');
        $('#option-editor-lint').prop('checked', localStorage['option-editor-lint'] == 'enabled');
        
        // starting tab
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
    function initStorage() {
        if (scripts && localStorage.length === 0) {
            importScripts(scripts);
            localStorage.setItem('recent', Object.keys(scripts)[0]);
        }
    }
    function initApi() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
        audioContext = new AudioContext();
        window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
        window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
    }
    function initCodeEditor() {
        var config = {
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
            gutters: ["CodeMirror-lint-markers","CodeMirror-linenumbers","CodeMirror-foldgutter"],
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
        };
        if (localStorage['option-editor-lint'] !== 'enabled') {
            config.lint = false;
        }
        if (localStorage['option-editor-fold'] !== 'enabled') {
            config.foldGutter = false;
        }
        editor = CodeMirror($('#editor')[0], config);
        if (localStorage['option-editor-lint'] !== 'enabled') {
            $('.CodeMirror-lint-markers').hide();
        }
        if (localStorage['option-editor-fold'] !== 'enabled') {
            $('.CodeMirror-foldgutter').hide();
        }
        scriptName = localStorage['recent'];
        refreshScriptList();
        loadScript(scriptName);
    }
    function onOptionEditorFold(e) {
        if (e.target.checked) {
            localStorage['option-editor-fold'] = 'enabled';
            $('.CodeMirror-foldgutter').show();
            editor.setOption('foldGutter', true);
        } else {
            localStorage['option-editor-fold'] = 'disabled';
            $('.CodeMirror-foldgutter').hide();
            editor.setOption('foldGutter', false);
        }
    }
    function onOptionEditorLint(e) {
        if (e.target.checked) {
            localStorage['option-editor-lint'] = 'enabled';
            $('.CodeMirror-lint-markers').show();
            editor.setOption('lint', {
                options: {
                    eqnull: true,
                    laxbreak: true,
                    laxcomma: true,
                    sub: true
                }
            });
        } else {
            localStorage['option-editor-lint'] = 'disabled';
            $('.CodeMirror-lint-markers').hide();
            editor.setOption('lint', false);
        }
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
        var $list, $ul, $li, groups, group, groupNames, groupName, names, name, path, originalName, width;
        originalName = scriptName; // need to change this repeatedly for width calculation
        $('#scripts').outerWidth('auto');
        $list = $('<div id="script-list"></div>');
        groups = buildScriptGroups();
        groupNames = Object.keys(groups).sort();
        width = 0;
        for (var i=0; i<groupNames.length; i++) {
            groupName = groupNames[i];
            group = groups[groupName];
            if(groupName.length > 0) {
                $list.append($('<div class="script-group-heading">'+groupName+'</div>'));
                $ul = $('<ul class="script-group"></ul>');
            } else {
                $ul = $('<ul class="script-root"></ul>');
            }
            if (group) {
                names = Object.keys(group).sort();
            }
            for (var j=0; j<names.length; j++) {
                name = names[j];
                path = group[name];
                $li = $('<li><a data-script-name="'+path+'">'+name+'</a></li>');
                $ul.append($li);
                setCurrentScriptName(path);
                width = Math.max(width, $('#scripts').outerWidth());
            }
            $list.append($ul);
        }
        setCurrentScriptName(originalName);
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
        var script, lines;
        if (name) {
            script = localStorage.getItem('script_' + name);
        }
        if (script == null) {
            name = '';
            script = defaultScript.toString();
            script = script.slice(script.indexOf("{") + 3, script.lastIndexOf("}"));
            lines = script.split('\n');
            lines = lines.map(function(line) { return line.trim(); });
            script = lines.join('\n');
        }
        setCurrentScriptName(name);
        editor.setValue(script);
        editor.clearHistory();
        //CodeMirror.commands.selectAll(editor);
        //CodeMirror.commands.indentAuto(editor);
        //editor.getDoc().setSelection({line: 0, ch:0});
        clearRegisteredScripts();
        registerScript(scriptName, script);
    }
    function onSaveAsClick() {
        var name = prompt('Enter a name for your script:');
        if (!name) {
            return; // cancel
        }
        saveCurrentScript(name);
        refreshScriptList();
        setCurrentScriptName(name);
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
        localStorage.setItem('script_' + name, script);
        clearRegisteredScripts();
        registerScript(name, script);
    }
    function getScriptFunctionSignature() {
        return 'function(' + getParamNames(defaultScript).join(', ') + ')';
    }
    function exportScripts() {
        var key, str, blob, scripts = [], keys = [];
        for (var i=0; i<localStorage.length; i++) {
            key = localStorage.key(i);
            if (key.substr(0,7) === 'script_') {
                keys.push(key);
            }
        }
        keys.sort();
        keys.forEach(function(key) {
            str = '/***************************************************************/\n';
            str += '"' + key.substr(7) + '":"' + getScriptFunctionSignature() + ' {\n';
            str += localStorage.getItem(key);
            str += '\n}';
            scripts.push(str);
        });
        str = 'scripts = {\n' + scripts.join(',\n\n') + '\n}\n';
        blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "tripscripts.js");
    }
    function exportScriptsJson() {
        var key, str, blob, scripts = {}, keys = [];
        for (var i=0; i<localStorage.length; i++) {
            key = localStorage.key(i);
            if (key.substr(0,7) === 'script_') {
                keys.push(key);
            }
        }
        keys.sort();
        keys.forEach(function(key) {
            scripts[key.substr(7)] = localStorage.getItem(key);
        });
        str = JSON.stringify(scripts, null, 2);
        blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "tripscripts.json");
    }
    function onImportFileChange(e) {
        if (e.currentTarget.files.length > 0) {
            importScriptsFile(e.currentTarget.files[0]);
        }
    }
    function importScriptsFile(file) {
        var reader;
        reader = new FileReader();
        reader.onload = function(e) {
            var scripts;
            try {
                scripts = JSON.parse(e.target.result); // JSON
                // eval(e.target.result); // JS
            } catch(err) {
                showError(err);
            }
            importScripts(scripts);
        };
        reader.readAsText(file);
    }
    function importScripts(scripts) {
        $.each(scripts, function(name, func) {
            var script = func.toString();
            var signature = getScriptFunctionSignature();
            if(script.substr(0,signature.length) === signature) {
                script = script.slice(script.indexOf("{") + 1, script.lastIndexOf("}")).trim();
            }
            localStorage.setItem('script_' + name, script);
        });
        refreshScriptList();
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
    function clearRegisteredScripts() {
        dynamicCodeScripts = {};
        resetScriptContext();
    }
    function resetScriptContext() {
        dynamicCodeContext = {};
        dynamicCodeIncludes = {};
        if (analyser) {
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            analyser.minDecibels = -100;
            analyser.maxDecibels = -30;
        }
        if (ctx) {
            ctx.setTransform(1,0,0,1,0,0);
            resize();
        }
    }
    function registerScript(name, script) {
        var func;
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
        try {
            func = new Function(getParamNames(defaultScript), script);
        } catch(ex) {
            showError(ex);
            return null;
        }
        dynamicCodeScripts[name] = func;
        clearError();
        return func;
    }
    function showError(err) {
        var errStr;
        if (err.reason) { // JSHINT
            errStr = 'Error: ' + err.reason + ' [' + err.script;
            if (err.line != null) {
                errStr += ': line ' + err.line;
            }
            errStr += ']';
            //console.log(err.reason, err.script, err.line, err.character);
        } else { // Runtime exception
            errStr = 'Error: ' + err.message;
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
        };
        var visible = function() {
            $toggle.empty().append($('<i class="fa fa-chevron-right"></i>'));
            $vis.css('width','50%');
            resize();
        };
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
        
        if ($this.data('panel') === '#code') {
            editor.refresh();
            editor.focus();
        }
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
    function onColumnClick(e) {
        function getValue($tr, sortField) {
            var $td = $($tr.find('td')[sortField]);
            var value = $td.text();
            if ($td.hasClass('num')) {
                value = parseInt(value);
            }
            return value;
        }
        var sortField = $(this).index();
        $('#playlist>tbody>tr').each(function() {
            var $this = $(this);
            var value = getValue($this, sortField);
            var $cursor = $('#playlist>tbody tr').first();
            while (value >= getValue($cursor, sortField)) {
                $cursor = $cursor.next();
                if ($cursor.length === 0) {
                    break;
                }
            }
            $this.insertBefore($cursor);
        });
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
        resetScriptContext();
        continueVis();
    }
    function continueVis() {
        animId = requestAnimationFrame(tick);
    }
    function stopVis() {
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }
    function tick() {
        frame += 1;
        var func = dynamicCodeScripts[scriptName];
        if (func != null) {
            try {
                func.apply(dynamicCodeContext, [ctx, analyser, audioContext, includeScript]);
            } catch (ex) {
                showError({reason: ex.message, script: scriptName, line: ex.lineNumber});
            }
        }
        continueVis();
    }
    function includeScript(name) {
        if (name in dynamicCodeIncludes) {
            return dynamicCodeIncludes[name];
        } else if ('script_' + name in localStorage) {
            var script = localStorage.getItem('script_' + name);
            var func = registerScript(name, script);
            try {
                dynamicCodeIncludes[name] = func.apply({}, [ctx, analyser, audioContext, includeScript]);
                return dynamicCodeIncludes[name];
            } catch (ex) {
                showError({reason: ex.message, script: name, line: ex.lineNumber});
                return;
            }
        } else {
            showError({reason: 'Script not found: "' + name + '"', script: name});
            return;
        }
    }
    function defaultScript(ctx, analyser, audioContext, include) {
        var Music = include('Utilities/Music');
        var Color = include('Utilities/Color');
        var Draw  = include('Utilities/Drawing');
        var Transform  = include('Utilities/Transform');
        
        Music.config(512, 0.85);
        var freq = Music.getFrequencyData();
        var wave = Music.getWaveformData();
    }
    init();
}