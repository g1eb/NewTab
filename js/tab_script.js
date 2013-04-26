$(function () {
    window.linkWidth = 100; // pixels
    window.linkHeight = 100; // pixels
    window.linkNum = 100; // number of links
    window.editMode = false; // editing mode

    // get saved number of links or use 100 as default
    chrome.storage.sync.get('linkNum',  function(val){
        window.linkNum = val['linkNum'] || 100;
        $('#linkNum').val(window.linkNum);
    });

    // get previous background color
    chrome.storage.sync.get('color',  function(val){
        window.color = val['color'] || getRandomColor();
        $('body').css('background-color', window.color);
    });

    // retrieve links from chrome storage
    chrome.storage.sync.get('links', function(val) {
        window.links = val['links'] || [];
        chrome.bookmarks.getTree(setBookmarks);
    });

    // set links in chrome storage
    chrome.storage.sync.set({'links': window.links},function() {});

    // setup the the num links field
    $('#linkNum').focusout(function() {
        var linkNum = $(this).val();
        if(linkNum <= 1000){
            chrome.storage.sync.set({'linkNum': linkNum},function() {});
            window.location.reload();
        }
    });

    // set click listener for the edit button
    $('#edit').click(function() {
        window.editMode = true;
    });

    window.setInterval(changeBackground, 60000); // change color every minute
});


function setBookmarks(bookmarks) {
    // looks for user-defined bookmarks and uses them as links
    if(bookmarks[0].children.length != 0){
        for(var i = 0; i < bookmarks[0].children.length; i++){
            if(bookmarks[0].children[i].children.length != 0){
                for(var j = 0; j < bookmarks[0].children[i].children.length; j++){
                    var link = bookmarks[0].children[i].children[j];
                    window.links.push(link);
                }
            }
        }
    }
    setLinks();
};


function getPossibleLinks() {
    // returns the amount of possible links given window  width and height and window parameters
    return parseInt(window.innerWidth / window.linkWidth) * parseInt(window.innerHeight / window.linkHeight);
}


function setLinks() {
    // fills up the screen with links and insters that into the content div
    var fitLinks = getPossibleLinks();

    while(fitLinks < window.linkNum){
        window.linkWidth = window.linkWidth - 1;
        window.linkHeight = window.linkHeight - 1;
        fitLinks = getPossibleLinks();
    }

    for(var counter = 0; counter < window.linkNum; counter++){
        var link = window.links[counter] || undefined;
        if(link == undefined){
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
        if(window.links[$(this).attr('id')] === undefined){
            // popup menu to select website + logo
            console.log("No url set at this location");
        } else {
            if(window.editMode == true){
                // popup menu to select a website + logo (website prefilled)
            } else {
                // actually redirecting the user to the requested page
                window.location = window.links[$(this).attr('id')].url;
            }
        }
    });
};


function changeBackground() {
    // animate background color
    window.color = getRandomColor();

    $('body').css('background-color', window.color );
};


function getRandomColor() {
    // returns a random color
    var result = 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
    chrome.storage.sync.set({'color': result});
    return result;
};
