'use strict';

/**
 * NewTab++ script
 * Minimalistic gateway to the interwebs.
 *
 * Written in april 2013 | Updated 2015
 */

/* globals chrome */

var tab = {

  // Dimensions (in px)
  d: 150,
  arr: [],

  // Edit mode
  editMode: false,

  // Initialization function
  init: function () {

    // Calculate dimensions
    tab.calcDimensions();

    // Get prev values
    tab.getPrevValues();

    // Setup click listeners
    tab.setClickListeners();

    // Setup links
    tab.setLinks();

    // Set submit listener for the link edit form
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

    // Set a change event listener on the image file field
    $('#link_image').change(function(e){
      file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = function (event) {
          window.imageData = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Set click listener on the link delete button
    $('#delete_link').click(function() {
      window.links[$('#link_id').val()] = undefined;
      chrome.storage.local.set({'links': window.links},function() {});
      window.location.reload();
    });

    // Set click listener on the close button of the edit popup
    $('#close_link_edit').click(function() {
      $('#link_edit').hide();
      tab.editMode = false;
    });

    // Set click listener to close the link edit popup
    $(document).keyup(function(e) {
      if(e.keyCode == 27) {
        $('#link_edit').hide();
        tab.editMode = false;
      }
    });

  },


  /**
   * Calculate dimensions
   */
  calcDimensions: function () {
    var x, prev;
    for ( var i = 100; i <= 1500; i++ ) {
      x = window.innerWidth / Math.ceil(window.innerWidth / i);
      if ( x !== prev ) tab.arr.push(x);
      prev = x;
    }
  },


  /**
   * Get preferences
   */
  getPrevValues: function() {

    // Get previous dimensions setting
    chrome.storage.sync.get('dimensions',  function(val){
      if ( !val.dimensions ) return;
      tab.d = val.dimensions;
    });

    // Get previous background color
    chrome.storage.sync.get('color',  function(val){
      window.color = val['color'];
      $('body').css('background-color', window.color);
      window.setInterval(function() {
        window.color = tab.getRandomColor();
        chrome.storage.sync.set({'color': window.color});
        $('body').css('background-color', window.color );
      }, 60000); // change color every minute
    });

    // Retrieve links from chrome storage
    chrome.storage.local.get('links', function(val) {
      window.links = val['links'] || [];
    });

  },

  /**
   * Setup click listeners
   */
  setClickListeners: function () {
    $('#btn-plus').bind('click', function() {
      var i = ( tab.arr.indexOf(tab.d) > -1 ) ? tab.arr.indexOf(tab.d) : tab.arr.indexOf(tab.closest(tab.d, tab.arr));
      if ( i === tab.arr.length-1 ) return;
      tab.d = tab.arr[i+1];
      tab.setLinks();
      chrome.storage.sync.set({'dimensions': tab.d});
    });

    $('#btn-minus').bind('click', function() {
      var i = ( tab.arr.indexOf(tab.d) > -1 ) ? tab.arr.indexOf(tab.d) : tab.arr.indexOf(tab.closest(tab.d, tab.arr));
      if ( i === 0 ) return;
      tab.d = tab.arr[i-1];
      tab.setLinks();
      chrome.storage.sync.set({'dimensions': tab.d});
    });

    // set click listener for the edit button
    $('#btn-edit').unbind('click').bind('click', function() {
        tab.editMode = true;
    });
  },


  /**
   * Fills up the screen with links
   */
  setLinks: function() {
    var numRows = Math.ceil(window.innerHeight / tab.d)+1;
    var numCols = Math.floor(window.innerWidth / tab.d);
    var numLinks = numRows*numCols;

    $('#content').empty();
    for(var counter = 0; counter < numLinks; counter++){
      var link = window.links[counter] || undefined;
      if(link == undefined){
        window.links[counter] = undefined;
        $('#content').append('<div id="'+counter+'" class="link" data-reveal-id="edit_popup"><div class="cover"></div><img class="filler" src="images/filler.svg" alt="add link image" /></div>');
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

    $('.link').css('width', parseInt(tab.d));
    $('.link').css('height', parseInt(tab.d));
    $('.link img').css('width', parseInt(tab.d/2));
    $('.link img').css('height', parseInt(tab.d/2));
    $('.link img').css('margin-top', parseInt(tab.d/4));
    $('.link_title').css('margin-top', parseInt(tab.d/2.2));

    $('.link').click(function(){
      var link = window.links[$(this).attr('id')];
      if(link === undefined){
        // popup menu to select website + logo
        $('#link_edit h1').text("Add a new link");
        $('#link_id').val($(this).attr('id'));
        $('#link_edit').show();
        $('#link_title').focus();
      } else {
        if(tab.editMode == true){
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
   * Helper function to get the closest number
   * @param num Number
   * @param arr Array
   */
  closest: function (num, arr) {
       var curr = arr[0];
       var diff = Math.abs (num - curr);
       for (var val = 0; val < arr.length; val++) {
           var newdiff = Math.abs (num - arr[val]);
           if (newdiff < diff) {
               diff = newdiff;
               curr = arr[val];
           }
       }
       return curr;
  },


  /**
   * Returns a random color
   */
  getRandomColor: function() {
    return 'rgb(' + (Math.floor(Math.random() * 255)) + ',' + (Math.floor(Math.random() * 255)) + ',' + (Math.floor(Math.random() * 255)) + ')';
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
