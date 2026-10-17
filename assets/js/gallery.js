/* ===============================================================
   Project galleries
   - In-page slideshow: arrows, thumbnails, swipe (scroll-snap)
   - Full-screen viewer: arrows, thumbnails, keyboard, swipe, Esc

   The page body is rendered by the design runtime after load, so
   everything here uses event delegation on `document` rather than
   binding to elements up front.
   =============================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  function slidesOf(gallery) {
    return Array.prototype.slice.call(gallery.querySelectorAll('.pg-slide'));
  }

  function currentIndex(gallery) {
    var track = gallery.querySelector('.pg-track');
    return Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    for (var key in attrs || {}) node.setAttribute(key, attrs[key]);
    return node;
  }

  function icon(name) {
    return el('i', 'ph-duotone ph-' + name, { 'aria-hidden': 'true' });
  }


  // -------------------------------------------------------------
  // In-page slideshow
  // -------------------------------------------------------------

  function goTo(gallery, index) {
    var count = slidesOf(gallery).length;
    var track = gallery.querySelector('.pg-track');

    // Wrap around at either end, like a carousel
    index = (index + count) % count;

    track.scrollTo({
      left: index * track.clientWidth,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  // Keep the counter, thumbnails and video playback in step with the track
  function syncGallery(gallery) {
    var index = currentIndex(gallery);
    var slides = slidesOf(gallery);

    var counter = gallery.querySelector('.pg-count');
    if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;

    gallery.querySelectorAll('.pg-thumb').forEach(function (thumb, i) {
      thumb.classList.toggle('is-active', i === index);
      thumb.setAttribute('aria-current', i === index ? 'true' : 'false');
    });

    // Pause any video swiped out of view; start the one just arrived at
    var changed = gallery.dataset.current !== String(index);
    gallery.dataset.current = index;

    slides.forEach(function (slide, i) {
      var video = slide.querySelector('video');
      if (!video) return;

      if (i !== index && !video.paused) {
        video.pause();
      } else if (i === index && changed && video.paused) {
        video.play().catch(function () { /* blocked by the browser: controls still work */ });
      }
    });
  }

  // `scroll` doesn't bubble, so listen in the capture phase
  var scrollTimers = new WeakMap();

  document.addEventListener('scroll', function (event) {
    var track = event.target;
    if (!track.classList || !track.classList.contains('pg-track')) return;

    var gallery = track.closest('.pg');
    clearTimeout(scrollTimers.get(gallery));
    scrollTimers.set(gallery, setTimeout(function () { syncGallery(gallery); }, 60));
  }, true);


  // -------------------------------------------------------------
  // Full-screen viewer
  // -------------------------------------------------------------

  var viewer = null;     // the overlay element, built on first use
  var state = { gallery: null, index: 0, returnFocus: null };

  function buildViewer() {
    viewer = el('div', 'lb', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo viewer' });
    viewer.hidden = true;

    var top = el('div', 'lb-top');
    var count = el('span', 'lb-count', { 'aria-live': 'polite' });
    var close = el('button', 'lb-btn lb-close', { type: 'button', 'aria-label': 'Close viewer' });
    close.appendChild(icon('x'));
    top.appendChild(count);
    top.appendChild(close);

    var stage = el('div', 'lb-stage');
    var prev = el('button', 'lb-btn lb-nav lb-prev', { type: 'button', 'aria-label': 'Previous' });
    var next = el('button', 'lb-btn lb-nav lb-next', { type: 'button', 'aria-label': 'Next' });
    prev.appendChild(icon('caret-left'));
    next.appendChild(icon('caret-right'));
    stage.appendChild(prev);
    stage.appendChild(next);

    var caption = el('p', 'lb-caption');
    var thumbs = el('div', 'lb-thumbs');

    viewer.appendChild(top);
    viewer.appendChild(stage);
    viewer.appendChild(caption);
    viewer.appendChild(thumbs);
    document.body.appendChild(viewer);

    close.addEventListener('click', closeViewer);
    prev.addEventListener('click', function () { showSlide(state.index - 1); });
    next.addEventListener('click', function () { showSlide(state.index + 1); });

    // Click on the dark backdrop (not the photo) closes, like Google Photos
    stage.addEventListener('click', function (event) {
      if (event.target === stage) closeViewer();
    });

    thumbs.addEventListener('click', function (event) {
      var thumb = event.target.closest('.lb-thumb');
      if (thumb) showSlide(Number(thumb.dataset.index));
    });

    // Swipe left / right on touch screens
    var startX = null;

    stage.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse') startX = event.clientX;
    });

    stage.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) showSlide(state.index + (dx < 0 ? 1 : -1));
    });
  }

  function openViewer(gallery, index) {
    if (!viewer) buildViewer();

    state.gallery = gallery;
    state.returnFocus = document.activeElement;

    // One thumbnail per slide in this project's gallery
    var thumbs = viewer.querySelector('.lb-thumbs');
    thumbs.innerHTML = '';

    slidesOf(gallery).forEach(function (slide, i) {
      var thumb = el('button', 'lb-thumb', { type: 'button', 'data-index': i, 'aria-label': 'Show item ' + (i + 1) });
      thumb.appendChild(el('img', '', { src: slide.dataset.thumb, alt: '' }));
      if (slide.dataset.type === 'video') {
        var badge = el('span', 'pg-play');
        badge.appendChild(icon('play-circle'));
        thumb.appendChild(badge);
      }
      thumbs.appendChild(thumb);
    });

    // Pause the in-page video so it doesn't play underneath
    gallery.querySelectorAll('video').forEach(function (video) { video.pause(); });

    viewer.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { viewer.classList.add('is-open'); });

    showSlide(index);
    viewer.querySelector('.lb-close').focus();
  }

  function closeViewer() {
    if (!viewer || viewer.hidden) return;

    // Carry the video position back to the in-page player
    var lbVideo = viewer.querySelector('video.lb-media');
    var slide = slidesOf(state.gallery)[state.index];
    var pageVideo = slide && slide.querySelector('video');
    if (lbVideo && pageVideo) {
      pageVideo.currentTime = lbVideo.currentTime;
      lbVideo.pause();
    }

    // Leave the in-page slideshow on the item last viewed
    goTo(state.gallery, state.index);

    viewer.classList.remove('is-open');
    viewer.hidden = true;
    document.documentElement.style.overflow = '';

    var media = viewer.querySelector('.lb-media');
    if (media) media.remove();

    if (state.returnFocus && state.returnFocus.focus) state.returnFocus.focus();
  }

  function showSlide(index) {
    var slides = slidesOf(state.gallery);
    index = (index + slides.length) % slides.length;
    state.index = index;

    var slide = slides[index];
    var stage = viewer.querySelector('.lb-stage');

    // Swap the photo / video
    var old = stage.querySelector('.lb-media');
    if (old) {
      if (old.tagName === 'VIDEO') old.pause();
      old.remove();
    }

    var media;
    if (slide.dataset.type === 'video') {
      media = el('video', 'lb-media', {
        src: slide.dataset.src,
        poster: slide.dataset.poster || '',
        controls: '',
        playsinline: '',
        preload: 'metadata'
      });

      // Pick up where the in-page player left off, then play
      var pageVideo = slide.querySelector('video');
      media.addEventListener('loadedmetadata', function () {
        if (pageVideo && pageVideo.currentTime) media.currentTime = pageVideo.currentTime;
        media.play().catch(function () { /* blocked by the browser: controls still work */ });
      }, { once: true });
    } else {
      media = el('img', 'lb-media', { src: slide.dataset.src, alt: slide.dataset.alt || '' });
      media.draggable = false;
    }

    stage.insertBefore(media, stage.querySelector('.lb-prev'));

    viewer.querySelector('.lb-count').textContent = (index + 1) + ' / ' + slides.length;
    viewer.querySelector('.lb-caption').textContent = slide.dataset.caption || '';

    // Single-item galleries don't need arrows
    var multiple = slides.length > 1;
    viewer.querySelector('.lb-prev').hidden = !multiple;
    viewer.querySelector('.lb-next').hidden = !multiple;

    viewer.querySelectorAll('.lb-thumb').forEach(function (thumb, i) {
      thumb.classList.toggle('is-active', i === index);
      if (i === index) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!viewer || viewer.hidden) return;

    if (event.key === 'Escape') {
      closeViewer();
    } else if (event.key === 'ArrowLeft') {
      showSlide(state.index - 1);
    } else if (event.key === 'ArrowRight') {
      showSlide(state.index + 1);
    } else if (event.key === 'Tab') {
      // Keep keyboard focus inside the viewer while it is open
      var focusable = viewer.querySelectorAll('button:not([hidden]), video');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  });


  // -------------------------------------------------------------
  // Clicks inside an in-page slideshow
  // -------------------------------------------------------------

  document.addEventListener('click', function (event) {
    var gallery = event.target.closest && event.target.closest('.pg');
    if (!gallery) return;

    if (event.target.closest('.pg-prev')) {
      goTo(gallery, currentIndex(gallery) - 1);
    } else if (event.target.closest('.pg-next')) {
      goTo(gallery, currentIndex(gallery) + 1);
    } else if (event.target.closest('.pg-thumb')) {
      goTo(gallery, Number(event.target.closest('.pg-thumb').dataset.index));
    } else if (event.target.closest('.pg-expand') || event.target.closest('img.pg-media')) {
      openViewer(gallery, currentIndex(gallery));
    }
  });
})();
