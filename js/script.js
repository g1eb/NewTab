/* NewTab++ script
 * Minimalistic gateway to the interwebs.
 *
 * Idea based on LinkTiles project
 * Written in april 2013 | Updated 2015
 */

$(function () {
    window.linkWidth = 100; // pixels
    window.linkHeight = 100; // pixels
    window.linkNum = 100; // number of links
    window.editMode = false; // editing mode
    window.intervalId = 0; // id of the interval

    // get saved number of links or use 100 as default
    chrome.storage.sync.get('linkNum',  function(val){
        window.linkNum = val['linkNum'] || 100;
        $('#linkNum').val(window.linkNum);
    });

    // get previous background color
    chrome.storage.sync.get('color',  function(val){
        window.color = val['color'];
        $('body').css('background-color', window.color);
        window.setInterval(function() {
            window.color = getRandomColor();
            $('body').css('background-color', window.color );
        }, 60000); // change color every minute
    });

    // retrieve links from chrome storage
    chrome.storage.local.get('links', function(val) {
        if('links' in val){
            window.links = val['links'] || [];
            setLinks();
        }
    });

    // set click listener for the edit button
    $('#edit').click(function() {
        window.editMode = true;
    });

    // set submit listener for the link edit form
    $('#link_edit_submit').click(function() {
        window.links[$('#link_id').val()] = {
            id: $('#link_id').val(),
            title: $('#link_title').val() || "",
            url: $('#link_url').val() || "",
            image: window.imageData
        }
        chrome.storage.local.set({'links': window.links},function() {});
        window.location.reload();
    });

    // set a change event listener on the image file field
    $('#link_image').change(function(e){
        file = e.target.files[0];
        var reader = new FileReader();
        reader.onload = function (event) {
            window.imageData = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // set click listener on the link delete button
    $('#delete_link').click(function() {
        window.links[$('#link_id').val()] = undefined;
        chrome.storage.local.set({'links': window.links},function() {});
        window.location.reload();
    });

    // set click listener on the close button of the edit popup
    $('#close_link_edit').click(function() {
        $('#link_edit').hide();
        window.editMode = false;
    });

    // set click listener to close the link edit popup
    $(document).keyup(function(e) {
        if(e.keyCode == 27) {
            $('#link_edit').hide();
            window.editMode = false;
        }
    });
});


function getOptimalLinkParameters() {
    // sets the most optimal link number, width and height
    window.linkWidth = window.linkHeight = Math.ceil(Math.sqrt((window.innerWidth * (window.innerHeight - 22)) / window.linkNum));

    while(window.innerWidth % window.linkWidth > 1){
        window.linkWidth += 1;
        window.linkHeight += 1;
    }
}


function setLinks() {
    // fills up the screen with links and insters that into the content div
    getOptimalLinkParameters();

    for(var counter = 0; counter < window.linkNum; counter++){
        var link = window.links[counter] || undefined;
        if(link == undefined){
            window.links[counter] = undefined;
            $('#content').append('<div id="'+counter+'" class="link" title="Add new link" data-reveal-id="edit_popup"><div class="cover"></div><img src="images/plus_icon.png" alt="add link image" /></div>');
        } else if(link['image'] == undefined){
            var url = 'chrome://favicon/'+link.url;
            var setLink = function(link) {
                return function(data) {
                    if(data.length == 228){
                        $('#content').append('<div id="'+counter+'" class="link" title="'+link.title+'"><div class="cover"></div><span class="link_title">'+link.title+'</span></div>');
                    }else{
                        $('#content').append('<div id="'+counter+'" class="link" title="'+link.title+'"><div class="cover"></div><img src="chrome://favicon/'+link.url+'" alt="link image" /></div>');
                    }
                };
            };
            $.ajax({url: url, async: false, success: setLink(link)});
        } else {
            $('#content').append('<div id="'+counter+'" class="link" title="'+link.title+'"><div class="cover"></div><img src="'+link.image+'" alt="link image" /></div>');
        }
    }

    $('.link').css('width', parseInt(window.linkWidth));
    $('.link').css('height', parseInt(window.linkHeight));
    $('.link img').css('width', parseInt(window.linkWidth/2));
    $('.link img').css('height', parseInt(window.linkHeight/2));
    $('.link img').css('margin-top', parseInt(window.linkHeight/4));
    $('.link_title').css('margin-top', parseInt(window.linkHeight/2.2));

    $('.link').click(function(){
        var link = window.links[$(this).attr('id')];
        if(link === undefined){
            // popup menu to select website + logo
            $('#link_edit h1').text("Add a new link");
            $('#link_id').val($(this).attr('id'));
            $('#link_edit').show();
            $('#link_title').focus();
        } else {
            if(window.editMode == true){
                // popup menu to select a website + logo (website prefilled)
                $('#link_edit h1').text(link.title);
                $('#link_title').val(link.title);
                $('#link_url').val(link.url);
                $('#link_id').val($(this).attr('id'));
                $('#link_edit').show();
                $('#link_title').focus();
            } else {
                // actually redirecting the user to the requested page
                var url = window.links[$(this).attr('id')].url;
                if(!isValidURL(url)){
                    url = "http://" + url;
                }
                window.location = url;
            }
        }
    });
};


function getRandomColor() {
    // returns a random color
    var result = 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
    chrome.storage.sync.set({'color': result});
    return result;
};


function isValidURL(url){
    // generic url validator based on regex
    return /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url);
};
