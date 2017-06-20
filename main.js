// ==UserScript==
// @name         OnlineSequencer.Net Plugins
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add some cool features/plugins to the OnlineSequencer.net app
// @author       William Merfalen
// @match        https://onlinesequencer.net/*
// @grant        none
// Changelog for version 0.2
// -- @user_name now *mentions* that user
//
// ==/UserScript==

(function() {
    //'use strict';
    if (window!=window.top) {
        //This evaluates if we are in an iframe (chat window)
        overrideFunctions();
        window.setTimeout(function(){
            if(typeof $("#message").html() == 'undefined'){
                window.setTimeout(this,300);
                return;
            }
            $("#message").trigger('focus');
        },800);
        return;
    }else{
        //This evaluates if we are in the main window (not chat window)
        //TODO: add button to make window smaller
        override_outer_window_functions();
        return;
    }
    function override_outer_window_functions(){
        window.showChat = function(){
            orig_showChat();
            window.setTimeout(function(){
                var max_retries = 10;
                if(typeof $("#chat_iframe").html() == 'undefined'){
                    if(--max_retries === 0){
                        return;
                    }else{
                        window.setTimeout(this,300);
                    }
                }
                //This makes the window 'maximized' (if you will)...
                $("#chatbox").attr("style","left: 397px; top: 249px; position: absolute; width: 100%; height:100%; right: auto; bottom: auto;");
                $("#chatbox_inner").attr("style","left:0px;top:0px;position:absolute;width:100%;height:100%;");
                $("#chatbox_inner iframe").attr("style","width:100%;height:90%;");
            },300);
        };

        function orig_showChat(){
            $("#chatplaceholder").html(
                '<div id="chatbox">' +
                    '<div id="chatbox_inner">' +
                        '<div id="chatbox_left"></div>' +
                        '<div id="chatbox_right">' +
                            '<a href="/logs?page=last" target="_blank">Chat Logs</a>'+
                            '&middot; <a href="/chat/" target="_blank">Mobile-friendly</a>'+
                            '&middot; <a href="javascript:hideChat()">'+
                                '<img src="/app/close.png" alt="Close">'+
                                      '</a>'+
                        '</div>'+
                        '<iframe id="chat_iframe" allowTransparency="true" scrolling="no" src="/forum/chat_frame.php" frameborder="0"></iframe>'+
                    '</div>'+
                '</div>'
            );
            $('#chatbox').draggable();
        }

    }

    function overrideFunctions(){
        var ofSelf = this;
        ofSelf.scrolling_up = false;
        ofSelf.queue_messages = false;
        ofSelf.queued_message_count = 0;
        ofSelf.username_capture = false;
        ofSelf.container = {
            'message_queue': []
        };

        window.setTimeout(function(){
            var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
            $('#chat_table').bind(mousewheelevt, function(e){
                var evt = window.event || e; //equalize event object
                evt = evt.originalEvent ? evt.originalEvent : evt; //convert to originalEvent if possible
                var delta = evt.detail ? evt.detail*(-40) : evt.wheelDelta; //check for detail first, because it is used by Opera and FF

                if(delta > 0) {
                    //scroll up
                    ofSelf.scrolling_up = true;
                    ofSelf.trigger('scrolling_up');
                }
                else{
                    ofSelf.scrolling_up = false;
                    if($(window).scrollTop() + $(window).height() == $(document).height()) {
                        ofSelf.trigger('close_queued_messages');
                    }
                }
            });
        },3000);


        /* ##                    ## */
        /* ## Function overrides ## */
        /* ##                    ## */
        window.sendChat = function() {
            orig_sendChat();
        };

        window.getChats = function() {
            orig_getChats();
        };

        window.getStatus = function(){
            orig_getStatus();
        };


        /* TODO: Turn this into an official event listener (addEventListener) */
        ofSelf.trigger = function(event_name,optional_parameter){
            switch(event_name){
                case 'scrolling_up':
                    return ofSelf.display.show_message_queue();
                case 'message_received':
                    return ofSelf.display.update_message_count(optional_parameter);
                case 'close_queued_messages':
                    if(ofSelf.container.message_queue.length === 0){
                        $("#message_queue").remove();
                        return;
                    }
                    return ofSelf.display.close_queued_messages();
                case 'message_keydown':
                    //Send message_key the 'event' object from the keyup handler
                    return ofSelf.message_key(optional_parameter);
                case 'autocomplete_username':
                    ofSelf.username_capture = true;
                    if(typeof $("#message_wrapper").html() == 'undefined'){
                        $("#message").wrap("<div id='message_wrapper' class=\"ui-widget\">");
                        $("#message").attr("style","color: #FFF;background-color: transparent;top: 0px; left: 0px; position:absolute;");
                    }
                    if($("#message").hasClass("ui-autocomplete-input")){
                        return;
                    }
                    $("#message")
                        .autocomplete({'source': function(request,response){
                            response(ofSelf.get_in_chat_array(request));
                        },select: function(event, ui) {
                            var TABKEY = 9;
                            if (event.keyCode == TABKEY) {
                                event.preventDefault();
                            }
                            var h = this.value;
                            $("#message").val($("#message").val().replace(/@[a-z0-9]+$/i,ui.item.value + " "))
                                    .focus();
                            return false;
                        },
                        autoFocus: true,
                        open: function(event, ui){
                            var $input = $(event.target),
                                $results = $input.autocomplete("widget"),
                                top = $results.position().top,
                                height = $results.height(),
                                inputHeight = $input.height(),
                                newTop = top - height - inputHeight;
                            $results.css("top", newTop + "px");
                        }
                    });
                    return;
                case 'autocomplete_username_close':
                    return;
                default:
                    break;
            }
        };

        ofSelf.display = {
            'show_message_queue': function(){
                if(typeof $("#message_queue").html() != 'undefined'){ /* Element already exists */ return; }
                $("#chat_table").append(
                            $("<div>")
                            .css("position","absolute")
                            .css("left","0")
                            .css("bottom","0")
                            .css("height","50px")
                            .css("width","100%")
                            .css("background-color","white")
                            .css("opacity","0.2")
                            .css("color","blue")
                            .attr("id","message_queue")
                );
                ofSelf.queue_messages = true;
            },
            'update_message_count': function(count){
                ofSelf.queued_message_count += count;
                var anchor = "<a href='javascript:void(0);' onClick='showQueuedMessages()'>";
                var prefix = "<b id='of_count'>";
                var message_html = ofSelf.container.message_queue.length == 1 ? " new message" : " new messages";
                message_html += "</a>";
                $("#message_queue").html([anchor,prefix,ofSelf.queued_message_count,"</b>",message_html].join(''));
            },
            'close_queued_messages': function(){
                ofSelf.queued_message_count = 0;
                ofSelf.queue_messages = false;
                $("#message_queue").remove();
                ofSelf.newMessage("<hr>");
                ofSelf.newMessage(["<div style='text-align:center'>",
                                   ofSelf.container.message_queue.length,
                                   ofSelf.container.message_queue.length == 1 ? " new message" : " new messages",
                                   "</div>"
                                  ].join('')
                );
                for(var i in ofSelf.container.message_queue){
                    ofSelf.newMessage(ofSelf.container.message_queue[i]);
                }
                ofSelf.container.message_queue = [];
            },
            'show_chat': function(){

            }
        };

        window.showQueuedMessages = function(){
            ofSelf.trigger('close_queued_messages');
        };

        ofSelf.getTable = function(){
            var id = small ? 'chat' : 'chat_table';
            return $("#" + id);
        };

        ofSelf.newMessage = function(msg){
            //TODO: if it contains '@our_user_name' highlight the message
            //TODO: (maybe) play audio sound when our name is mentioned?
            ofSelf.getTable().append(msg);
        };

        ofSelf.message_key = function(event_object){
            if(ofSelf.username_capture){
                if($("#message").val().match(/@+/) === null){
                    ofSelf.trigger('autocomplete_username_close');
                }
            }
            if(event_object.key == "@"){
                ofSelf.trigger('autocomplete_username');
                return;
            }
        };

        ofSelf.new_script  = function(src,callback){
            var s = document.createElement("script");
            s.type = "text/javascript";
            s.src = src;
            if(callback){
                s.addEventListener('load',callback);
            }
            document.body.appendChild(s);
        };

        ofSelf.new_stylesheet  = function(src){
            var s = document.createElement("link");
            s.type = "text/css";
            s.rel = "stylesheet";
            s.href = src;
            document.body.appendChild(s);
        };
        ofSelf.embed_raw_css = function(css){
            var s = document.createElement("style");
            s.type = "text/css";
            s.textContent = css;
            document.body.appendChild(s);
        };
        ofSelf.match_last = function(regex){
            var results = $("#message").val().match(new RegExp('(@[a-z0-9]*)$','i'));
            if(results){
                return results.pop();
            }
            return null;
        };
        ofSelf.get_in_chat_array = function(request){
            var last_match = ofSelf.match_last();
            if(!last_match){
                return [];
            }
            var splits = $("#status").html().split(",");
            if(splits.length == 1){
                return [];
            }else{
                splits[0] = splits[0].replace(/In Chat: /,'');
                var results = [];
                for(var i in splits){
                    var match_this = '@' + splits[i].replace(' ','');
                    if(last_match === null || match_this.match(new RegExp(last_match + '[a-z0-9]*','i'))){
                        results.push({ 'label' : '@' + splits[i].replace(' ',''), 'value': '@' + splits[i].replace(' ','') });
                    }
                }
                return results;
            }
        };

        function orig_sendChat(){
            var msg = document.getElementById('message');
            if(msg && !disabled) {
                msg.id = 'message_disabled';
                msg.disabled = 'disabled';
                disabled = true;
                $.post('xmlhttp.php?action=ajaxchat_send', {message: msg.value}, function() {
                    msg.id = 'message';
                    msg.disabled = '';
                    disabled = false;
                    msg.value = '';
                    msg.focus();
                });
            }
        }

        function orig_getChats() {
            inprogress = true;
            $.post('xmlhttp.php?action=ajaxchat_get', {id: lastRequest, limit: small ? 1 : 20}, function(result) {
                inprogress = false;
                lastRequest = result[0];
                n = result[1];
                chatHTML = "";
                for(var i=2; i < n; i++)
                {
                    chatHTML = result[i]+"\n"+chatHTML;
                }
                if(n > 2)
                {
                    var table = document.getElementById(small ? 'chat' : 'chat_table');
                    if (small) {
                        table.innerHTML = chatHTML;
                    } else {
                        //If we are queueing the messages, then simply store it in a container until the user decides to scroll back down
                        if(ofSelf.queue_messages){
                            ofSelf.trigger('message_received',n-2);
                            ofSelf.container.message_queue = ofSelf.container.message_queue.concat(chatHTML);
                        }else{
                            table.innerHTML += chatHTML;
                            window.setTimeout(function() {
                                table.scrollTop = table.scrollHeight + 10000;
                            }, 100);
                        }
                    }
                }
                setTimeout(window.getChats, small ? 10000 : 1000);
            });
        }

        function orig_getStatus() {
            if (!small) {
                $.post('xmlhttp.php?action=ajaxchat_status', {id: lastRequest}, function(result) {
                    document.getElementById('status').innerHTML = result;
                });
            }
        }

        ofSelf.new_stylesheet("https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css");
        ofSelf.new_stylesheet("https://jqueryui.com/resources/demos/style.css");
        ofSelf.embed_raw_css('#main{  position: absolute;top: 0;left: 0;z-index: 11;background: transparent;}#autocomplete{ position: absolute;top: 0;left: 0;background: transparent;z-index: 10;}');
        ofSelf.new_script("https://code.jquery.com/ui/1.12.1/jquery-ui.js",function(){
            ofSelf.trigger('autocomplete_username');
        });
        $("div.input-field").attr("style","position:absolute;left:0;right:108px; bottom: 0px;");
    }

})();
