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

  // Image data
  imageData: null,

  // Links
  links: [],

  // Background color
  color: 'rgb(255, 255, 255)',
  colorInterval: 60000,

  // Initialization function
  init: function () {

    // Init background color
    tab.initBackgroundColor();

    // Calculate dimensions
    tab.calcDimensions();

    // Get prev values
    tab.getPrevValues(function () {
      tab.setLinks();
    });

    // Setup click listeners
    tab.setClickListeners();

    // Update links on resize event
    var timeoutId;
    window.onresize = function () {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        tab.arr = [];
        tab.calcDimensions();
        tab.setLinks();
      }, 300);
    };
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
      if ( val.dimensions ) tab.d = val.dimensions;

      // Retrieve links from chrome storage
      chrome.storage.local.get('links', function(val) {
        if ( val.links ) tab.links = val.links;

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
      tab.biggerLinks();
    });

    $('#btn-minus').bind('click', function() {
      tab.smallerLinks();
    });

    // Set submit listener for the link edit form
    $('#link-edit-submit').unbind('click').bind('click', function () {
      var linkId = parseInt($('#link-id').val());
      tab.links[linkId] = {
        id: linkId,
        title: $('#link-title').val() || '',
        url: $('#link-url').val() || '',
        image: tab.imageData
      };
      chrome.storage.local.set({'links': tab.links}, function() {
        tab.setLinks();
      });
    });

    // Set a change event listener on the image file field
    $('#link-image').change(function(e){
      var file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = function (event) {
          tab.imageData = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Set click listener on the link delete button
    $('#btn-delete').unbind('click').bind('click', function () {
      var linkId = parseInt($('#link-id').val());
      tab.links[linkId] = undefined;
      tab.closeLinkEdit();
      chrome.storage.local.set({'links': tab.links}, function () {
        tab.setLinks();
      });
    });

    // Set click listener on the close button of the edit popup
    $('#btn-close').unbind('click').bind('click', function () {
      tab.closeLinkEdit();
    });

    // Set click listener to close the link edit popup
    $(document).keyup(function(e) {
      if ( e.keyCode === 27 ) {
        tab.closeLinkEdit();
      }
    });
  },


  /**
   * Make the links bigger
   */
  biggerLinks: function () {
    var i = ( tab.arr.indexOf(tab.d) > -1 ) ? tab.arr.indexOf(tab.d) : tab.arr.indexOf(tab.closest(tab.d, tab.arr));
    if ( i === tab.arr.length-1 ) return;
    tab.d = tab.arr[i+1];
    tab.setLinks();
    chrome.storage.sync.set({'dimensions': tab.d});
  },


  /**
   * Make the links smaller
   */
  smallerLinks: function () {
    var i = ( tab.arr.indexOf(tab.d) > -1 ) ? tab.arr.indexOf(tab.d) : tab.arr.indexOf(tab.closest(tab.d, tab.arr));
    if ( i === 0 ) return;
    tab.d = tab.arr[i-1];
    tab.setLinks();
    chrome.storage.sync.set({'dimensions': tab.d});
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
        content = '<div id="'+i+'" class="link"><div class="cover"></div><img class="filler" src="images/filler.svg" alt="add link image" /></div>';
      } else {
        if ( link.image ) {
          content = '<div id="'+i+'" class="link"><div class="cover"></div><img class="link-image" src="'+link.image+'" alt="link image" /></div>';
        } else {
          var letter = ( link.title.length > 0 ) ? link.title[0] : '?';
          content = '<div id="'+i+'" class="link"><div class="cover"></div><span class="link-letter">'+letter+'</span></div>';
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
    $('.link span').css('font-size', parseInt(tab.d)+'px');
    $('.link span').css('line-height', parseInt(tab.d)+'px');
  },


  /**
   * Setup link click listeners
   */
  setupLinkClickListeners: function () {
    $('.link').unbind('click').bind('click', function(){
      if ( tab.editMode ) return;
      var linkId = $(this).attr('id');
      if ( !tab.links[linkId] ) return tab.openLinkEdit(linkId);
      var url = tab.links[linkId].url;
      if ( !tab.isValidURL(url) ) url = 'http://' + url;
      window.location = url;
    });

    var timeoutId;
    $('.link').unbind('mousedown').bind('mousedown', function () {
      var linkId = $(this).attr('id');
      timeoutId = setTimeout(function () {
        tab.editMode = true;
        tab.openLinkEdit(linkId);
      }, 500);
    });
    $('.link').unbind('mouseup mouseleave').bind('mouseup', function () {
      clearTimeout(timeoutId);
    });
  },


  /**
   * Open link edit modal
   * @param linkId Integer id of the link
   */
  openLinkEdit: function (linkId) {
    var link = tab.links[linkId];
    if ( link ) {
      $('#link-edit .header').text(link.title);
      $('#link-title').val(link.title);
      $('#link-url').val(link.url);
      $('#link-id').val(linkId);
      $('#link-edit').show();
      $('#btn-delete').show();
      $('#link-title').focus();
    } else {
      $('#btn-delete').hide();
      $('#link-edit .header').text('Add a new item');
      $('#link-title').val('');
      $('#link-url').val('');
      $('#link-id').val(linkId);
      $('#link-edit').show();
      $('#link-title').focus();
    }
  },


  /**
   * Close link edit modal
   */
  closeLinkEdit: function () {
    $('#link-edit').hide();
    tab.editMode = false;
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

document.addEventListener('DOMContentLoaded', tab.init);
