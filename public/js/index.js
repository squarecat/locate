mapboxgl.accessToken = 'pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jivings/cixd0oqdt00hv2qnvdzlx97xj',
    zoom: 5,
    center: [4.899, 52.372]
});

var offsetInMinutes;
var defaultPosition;
var allPhotos;

fetch("/moves/me")
  .then(body => {
    return body.json();
  })
  .then(({ profile }) => renderProfile(profile))
  .catch(err => {
    console.error(err);
  });

fetch("/moves/today")
  .then(body => {
    return body.json();
  })
  .then(moves => renderLatestMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/photos")
  .then(body => {
    return body.json();
  })
  .then(images => {
    console.log(images);
    var photos = allPhotos = images.data;

    document.querySelectorAll('.js-photo').forEach(function (p, i) {
      p.setAttribute('data-photo-id', photos[i].id);
      p.innerHTML = '<img src="' + photos[i].images.standard_resolution.url + '"/>';
    });
  })
  .catch(err => {
    console.error(err);
  });

function setTime() {
  const localTime = moment().utcOffset(offsetInMinutes);
  document.getElementById("local-time").innerText = localTime.format("HH:mma");
}

function onPhotoFocus(e) {
  e.preventDefault();
  var el = e.currentTarget.querySelector('.js-photo');
  var focussedAlready = el.classList.contains('photo--focussed');
  onPhotoUnfocus();
  if (focussedAlready) return map.panTo(defaultPosition);
  el.classList.add('photo--focussed');
  document.querySelectorAll('.js-photos-list').forEach(function (el) {
    el.classList.add('photos--focussed');
  });
  var photoId = el.getAttribute('data-photo-id');
  var photoDetails = allPhotos.find(function(p) {
    return p.id === photoId;
  })
  if (photoDetails.location) {
    map.panTo([ photoDetails.location.longitude, photoDetails.location.latitude ]);
  }

  return false;
}

function onPhotoUnfocus() {
  document.querySelectorAll('.photos--focussed').forEach(function (el) {
    el.classList.remove('photos--focussed');
  });
  document.querySelectorAll('.photo--focussed').forEach(function (el) {
    el.classList.remove('photo--focussed');
  });

}

function renderProfile(profile) {
  const { currentTimeZone } = profile;
  offsetInMinutes = currentTimeZone.offset / 60;
  setTime();
  setInterval(function () {
    setTime();
  }, 1000)
}

function renderLatestMoves(moves) {
  console.log(moves);
  const lastSeenAt = moment(moves[0].lastUpdate);
  const lastSeenPlace = moves[0].segments[moves[0].segments.length - 1];
  // document.getElementById("last-seen").innerText = lastSeenAt.format("Do MMM HH:mma");
  const location = lastSeenPlace.place.location;
  var latlng = [location.lon, location.lat];
  defaultPosition = latlng;
  map.panTo(latlng);
  var marker = new mapboxgl.Marker(document.getElementById("marker"))
    .setLngLat(latlng)
    .addTo(map);
  fetch("https://api.mapbox.com/geocoding/v5/mapbox.places/"+latlng+".json?access_token=pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ")
    .then(body => body.json())
    .then(res => {
      document.getElementById("current-place").innerText = res.features[0].place_name;
    })
}

document.querySelectorAll('.js-photo-link').forEach(function (el) {
  el.addEventListener('click', onPhotoFocus);
});