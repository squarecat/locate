mapboxgl.accessToken = 'pk.eyJ1Ijoiaml2aW5ncyIsImEiOiJ6dzhhM1FJIn0.irjChrcnF1fcbBbDLvjVUQ';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jivings/cixd0oqdt00hv2qnvdzlx97xj',
    zoom: 5,
    center: [4.899, 52.372]
});

var offsetInMinutes;

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


function setTime() {
  const localTime = moment().utcOffset(offsetInMinutes);
  document.getElementById("local-time").innerText = localTime.format("HH:mma");
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