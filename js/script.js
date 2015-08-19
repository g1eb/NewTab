/* NewTab++ script
 * Minimalistic gateway to the interwebs.
 *
 * Idea based on LinkTiles project
 * Written in april 2013 | Updated 2015
 */

var tab = {

  // Dimensions in px
  rowHeight: 150,
  colWidth: 150,
  arr: [],

  // Edit mode
  editMode: false,

  // Initialization function
  init: function () {

    // get previous dimensions setting
    chrome.storage.sync.get('dimensions',  function(val){
        if ( !val.dimensions ) return;
        tab.rowHeight = val.dimensions.rowHeight;
        tab.colWidth = val.dimensions.colWidth;
    });

    // get previous background color
    chrome.storage.sync.get('color',  function(val){
        window.color = val['color'];
        $('body').css('background-color', window.color);
        window.setInterval(function() {
            window.color = tab.getRandomColor();
            chrome.storage.sync.set({'color': window.color});
            $('body').css('background-color', window.color );
        }, 60000); // change color every minute
    });

    // retrieve links from chrome storage
    chrome.storage.local.get('links', function(val) {
      window.links = val['links'] || [];
      tab.setLinks();
    });

    // set click listener for the edit button
    $('#edit').click(function() {
        window.editMode = true;
    });

    var rowHeight = 100;
    var colWidth = 100;
    var prev = {r: 100, c: 100};
    var r, c;
    while ( rowHeight <= 1500 ) {
      r = c = window.innerWidth / Math.ceil(window.innerWidth / colWidth);
      if ( !(prev.r === r && prev.c === c) ) tab.arr.push({r:r,c:c});
      rowHeight = colWidth = rowHeight + 1;
      prev = {r: r, c: c};
    }

    var i = 0;
    var timeoutPlus = 0;
    $('#btn-plus').bind('mousedown', function() {
      timeoutPlus = setInterval(function () {
        tab.rowHeight = tab.arr[i].r;
        tab.colWidth = tab.arr[i].c;
        i++;
        if ( i === tab.arr.length ) i--;
        tab.setLinks();
        chrome.storage.sync.set({'dimensions': {rowHeight: tab.rowHeight, colWidth: tab.colWidth}});
      }, 150);
    }).bind('mouseup mouseleave', function() {
      clearTimeout(timeoutPlus);
    });

    var timeoutMinus = 0;
    $('#btn-minus').bind('mousedown', function() {
      timeoutMinus = setInterval(function () {
        tab.rowHeight = tab.arr[i].r;
        tab.colWidth = tab.arr[i].c;
        i--;
        if ( i < 0 ) i = 0;
        tab.setLinks();
        chrome.storage.sync.set({'dimensions': {rowHeight: tab.rowHeight, colWidth: tab.colWidth}});
      }, 150);
    }).bind('mouseup mouseleave', function() {
      clearTimeout(timeoutMinus);
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

  },


  /**
   * Fills up the screen with links
   */
  setLinks: function() {
    var numRows = Math.ceil(window.innerHeight / tab.rowHeight)+1;
    var numCols = Math.floor(window.innerWidth / tab.colWidth);
    var numLinks = numRows*numCols;

    $('#content').empty();
    for(var counter = 0; counter < numLinks; counter++){
        var link = window.links[counter] || undefined;
        if(link == undefined){
            window.links[counter] = undefined;
            $('#content').append('<div id="'+counter+'" class="link" data-reveal-id="edit_popup"><div class="cover"></div><img src="images/plus_icon.png" alt="add link image" /></div>');
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

    $('.link').css('width', parseInt(tab.colWidth));
    $('.link').css('height', parseInt(tab.rowHeight));
    $('.link img').css('width', parseInt(tab.colWidth/2));
    $('.link img').css('height', parseInt(tab.rowHeight/2));
    $('.link img').css('margin-top', parseInt(tab.rowHeight/4));
    $('.link_title').css('margin-top', parseInt(tab.rowHeight/2.2));

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
                if(!tab.isValidURL(url)){
                    url = "http://" + url;
                }
                window.location = url;
            }
        }
    });
  },


  /**
   * Returns a random color
   */
  getRandomColor: function() {
    return 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
  },


  /**
   * Validate url
   * @param url String
   */
  isValidURL: function(url) {
    return /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url);
  }

};

document.addEventListener("DOMContentLoaded", tab.init);
