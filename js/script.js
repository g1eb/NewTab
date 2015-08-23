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

  // Links
  links: [],

  // Background color
  color: 'rgb(255, 255, 255)',
  colorInterval: 60000,

  // Initialization function
  init: function () {

    // Calculate dimensions
    tab.calcDimensions();

    // Get prev values
    tab.getPrevValues(function () {
      tab.setLinks();
    });

    // Init background color
    tab.initBackgroundColor();

    // Setup click listeners
    tab.setClickListeners();

    // Set submit listener for the link edit form
    $('#link_edit_submit').click(function() {
      tab.links[$('#link_id').val()] = {
        id: $('#link_id').val(),
        title: $('#link_title').val() || "",
        url: $('#link_url').val() || "",
        image: window.imageData
      }
      chrome.storage.local.set({'links': tab.links},function() {});
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
      tab.links[$('#link_id').val()] = undefined;
      chrome.storage.local.set({'links': tab.links},function() {});
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
   * @param cb Callback function
   */
  getPrevValues: function(cb) {

    // Get previous dimensions setting
    chrome.storage.sync.get('dimensions',  function(val){
      if ( !val.dimensions ) return;
      tab.d = val.dimensions;

      // Retrieve links from chrome storage
      chrome.storage.local.get('links', function(val) {
        if ( !val.links ) return;
        tab.links = val.links;

        // Callback function
        if ( typeof(cb) === 'function' ) cb();
      });
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

    var link, content;
    $('#content').empty();
    for ( var i = 0; i < numLinks; i++ ) {
      link = tab.links[i] || undefined;
      if ( !link ) {
        content = '<div id="'+i+'" class="link" data-reveal-id="edit_popup"><div class="cover"></div><img class="filler" src="images/filler.svg" alt="add link image" /></div>';
      } else {
        if ( link.image ) {
          content = '<div id="'+i+'" class="link"><div class="cover"></div><img class="link-image" src="'+link.image+'" alt="link image" /></div>';
        } else {
          content = '<div id="'+i+'" class="link"><div class="cover"></div><span class="link-letter">'+link.title[0]+'</span></div>';
        }
      }
      $('#content').append(content);
    }

    // Adjust styles
    tab.updateStyles();

    // Setup click listeners for the links
    tab.setupLinkClickListeners();
  },

  /**
   * Update css styles
   */
  updateStyles: function () {
    $('.link').css('width', parseInt(tab.d));
    $('.link').css('height', parseInt(tab.d));
    $('.link img').css('width', parseInt(tab.d/2));
    $('.link img').css('height', parseInt(tab.d/2));
    $('.link img').css('margin-top', parseInt(tab.d/4));
    $('.link span').css('font-size', parseInt(tab.d));
    $('.link_title').css('margin-top', parseInt(tab.d/2.2));
  },


  /**
   * Setup link click listeners
   */
  setupLinkClickListeners: function () {
    $('.link').unbind('click').bind('click', function(){
      var linkId = $(this).attr('id');
      var link = tab.links[linkId];
      if ( !link ) {
        // Popup menu to create a link
        $('#link_edit h1').text('Add a new link');
        $('#link_id').val(linkId);
        $('#link_edit').show();
        $('#link_title').focus();
      } else {
        if ( tab.editMode ) {
          // Popup menu to edit a link
          $('#link_edit h1').text(link.title);
          $('#link_title').val(link.title);
          $('#link_url').val(link.url);
          $('#link_id').val(linkId);
          $('#link_edit').show();
          $('#link_title').focus();
        } else {
          // Redirect the user to the requested page
          var url = tab.links[linkId].url;
          if ( !tab.isValidURL(url) ) url = 'http://' + url;
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
   * Init background color
   */
  initBackgroundColor: function() {
    tab.setBackgroundColor();
    window.setInterval(function() {
      tab.setBackgroundColor();
    }, tab.colorInterval);
  },


  /**
   * Set background color
   */
  setBackgroundColor: function () {
    tab.color = tab.generateRandomColor();
    $('body').css('background-color', tab.color);
  },


  /**
   * Generate random color
   */
  generateRandomColor: function() {
    return 'rgb(' + (Math.floor(Math.random() * 200)+55) + ',' + (Math.floor(Math.random() * 200)+55) + ',' + (Math.floor(Math.random() * 200)+55) + ')';
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
