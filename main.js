// ==UserScript==
// @name         OnlineSequencer.Net Plugins
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add some cool features/plugins to the OnlineSequencer.net app
// @author       William Merfalen
// @match        https://onlinesequencer.net/*
// @grant        none
// Changelog for version 0.2
// -- Added minimize button at the top right
// -- resized window to show the close button at the top
// ==/UserScript==

(function() {
    //'use strict';
    if (window!=window.top) {
        //This evaluates if we are in an iframe (chat window)
        $(window).scroll(function() {
            //unused for now
        });
        return overrideFunctions();
    }else{
        //This evaluates if we are in the main window (not chat window)
        //TODO: add button to make window smaller
        return override_outer_window_functions();
    }



    var plugin_div = $("<div>").css("left","0px")
        .css("top","0px")
        .css("position","absolute")
        .css("background-color","green")
        .css("width","100px")
        .css("height","100px");
    var activation_button = $("<button>")
        .bind('click',function(){
            showChat();
        })
        .attr('id','activate_plugin')
        .html("Activate Plugin")
    ;

    function override_outer_window_functions(){
        window.showChat = function(){
            orig_showChat();
            window.setTimeout(function(){
                var max_retries = 10;
                if(typeof $("#chat_iframe").html() == 'undefined'){
                    console.log("chat_iframe not populated yet...");
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
        ofSelf.container = {
            'message_queue': []
        };
        window.setTimeout(function(){
            var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
            console.log("Chatbox: " + $("#chat_table"));
            $('#chat_table').bind(mousewheelevt, function(e){
                var evt = window.event || e; //equalize event object
                evt = evt.originalEvent ? evt.originalEvent : evt; //convert to originalEvent if possible
                var delta = evt.detail ? evt.detail*(-40) : evt.wheelDelta; //check for detail first, because it is used by Opera and FF

                if(delta > 0) {
                    //scroll up
                    console.log("scroll up");
                    ofSelf.scrolling_up = true;
                    ofSelf.trigger('scrolling_up');
                }
                else{
                    //scroll down
                    console.log("scroll down");
                    //TODO: when the user scrolls back down to the end of the chat, unqueue the messages and remove the queue_message div
                    ofSelf.scrolling_up = false;
                    if($(window).scrollTop() + $(window).height() == $(document).height()) {
                        ofSelf.trigger('close_queued_messages');
                    }
                }
            });
        },3000);

        /*

        ##
        ## The following functions are just to use for testing.. they simulate scrolling up and messages coming in ##
        ##

        window.setTimeout(function(){
            ofSelf.trigger('scrolling_up');
        },4000);

        window.setTimeout(function(){
            ofSelf.container.message_queue.push('test_user_1:: this is a test message');
            ofSelf.container.message_queue.push('test_user_2:: this is a test message');
            ofSelf.container.message_queue.push('test_user_3:: HELLO');
            ofSelf.trigger('message_received',3);
        },6000);

        window.setTimeout(function(){
            ofSelf.container.message_queue.push('test:: this is a test message');
            ofSelf.container.message_queue.push('LucentTear:: I HAVE BEEN ON THIS SITE FOR 2 YEARS');
            ofSelf.trigger('message_received',5);
        },7000);

        */


        /* ##                    ## */
        /* ## Function overrides ## */
        /* ##                    ## */
        window.sendChat = function() {
            console.log("send chat stub");
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
                console.log("inside close queued message");
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
            for(var i in ofSelf.container.message_queue){
                console.log("Message: " + ofSelf.container.message_queue[i]);
            }
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
    }

    $("body").append(
        plugin_div.append(activation_button)
    );
})();
