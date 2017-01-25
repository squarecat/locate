document.body.setAttribute("data-loaded", true);
fetch("/moves/me")
  .then(body => {
    return body.json();
  })
  .then(({ profile }) => renderProfile(profile))
  .catch(err => {
    console.error(err);
  });

fetch("/moves/latest")
  .then(body => {
    return body.json();
  })
  .then(moves => renderLatestMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/moves/today")
  .then(body => {
    return body.json();
  })
  .then(moves => renderTodayMoves(moves))
  .catch(err => {
    console.error(err);
  });

fetch("/photos")
  .then(body => {
    return body.json();
  })
  .then(images => {
    console.log(images);
    let photos = allPhotos = images.reduce((all, userImages) => {
      return all.concat(userImages.data);
    }, []);
    photos = photos.sort(function (a, b) { return b.created_time - a.created_time });

    document.querySelectorAll('.js-photo').forEach(function (p, i) {
      if (!photos[i]) return;
      p.setAttribute('data-photo-id', photos[i].id);
      p.innerHTML = '<img src="' + photos[i].images.standard_resolution.url + '"/>';
    });

    photos.forEach(photo => {
      if (!photo.location) return;
      const marker = {
        "type": "Feature",
        "properties": {
          "message": "Baz",
          "iconSize": [20, 20]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            photo.location.longitude,
            photo.location.latitude
          ]
        }
      };
      // const el = document.createElement('div');
      // el.className = 'image-marker';
      // el.style.backgroundImage = 'url('+photo.images.thumbnail.url+')';
      // el.style.width = marker.properties.iconSize[0] + 'px';
      // el.style.height = marker.properties.iconSize[1] + 'px';

      // new mapboxgl.Marker(el)
      //   .setLngLat(marker.geometry.coordinates)
      //   .addTo(map);
      // el.addEventListener('click', function() {
      //   window.alert(marker.properties.message);
      // });
    });
  })
  .catch(err => {
    console.error(err);
  });