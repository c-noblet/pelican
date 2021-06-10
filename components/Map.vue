<template>
  <div id="map"></div>
</template>
<script>
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import mbxGeocoder from '@mapbox/mapbox-sdk/services/geocoding';
import * as turf from '@turf/turf';
import routes, { trains, airplanes } from '../store/db/transportsDb';
import { canMove } from '../plugins/utils';

mapboxgl.accessToken = 'pk.eyJ1IjoiYy1ub2JsZXQiLCJhIjoiY2tqN2NoN29oMWR6NTJ6bnFzbmY2cXd2bCJ9.cNuK4kk5SPJl-zsqwAxkPw';

export default {
  name: 'Map',
  computed: {
    player() {
      return this.$store.getters['game/player'];
    },
    game() {
      return this.$store.state.game;
    },
  },
  data() {
    return {
      map: null,
      geocoder: null,
      playerMarker: null,
      destinationsMarker: [],
      oponentsMarker: [],
      stations: [],
      airports: [],
    };
  },
  async mounted() {
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [2, 46],
      // center: [20,50],
      zoom: 5,
      doubleClickZoom: false,
    });

    this.geocoder = mbxGeocoder({ accessToken: mapboxgl.accessToken });

    this.map.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
      }),
    );

    this.map.addControl(new mapboxgl.NavigationControl());

    this.map.on('load', async () => {
      await this.drawLine(trains);
      trains.forEach((station) => {
        if (!this.stations.includes(station.origin)) {
          this.stations.push(station.origin);
        }
        if (!this.stations.includes(station.destination)) {
          this.stations.push(station.destination);
        }
      });
      this.setPoints('stations', this.stations, '#00ff00');

      await this.drawLine(airplanes, true);

      airplanes.forEach((airplane) => {
        if (!this.airports.includes(airplane.origin)) {
          this.airports.push(airplane.origin);
        }
        if (!this.airports.includes(airplane.destination)) {
          this.airports.push(airplane.destination);
        }
      });
      this.setPoints('airports', this.airports, '#ff0000');
      this.$store.getters['game/players'].forEach(async (player) => {
        if (player.id === this.player.id) {
          player.destinations.forEach(async (dest) => {
            const destMarker = await this.setMarker(dest, '#ff00ff');
            this.destinationsMarker.push({
              name: dest,
              marker: destMarker,
            });
          });
        }
      });

      this.$store.getters['game/players'].forEach(async (player) => {
        if (player.id === this.player.id) {
          console.log('my location', player.location);
          const marker = await this.setMarker(player.location, '#0000ff');
          this.playerMarker = marker;
        } else {
          const marker = await this.setMarker(player.location, '#ff0000');
          this.oponentsMarker.push({
            id: player.id,
            marker,
          });
        }
      });
    });

    // this.map.on('click', 'stations', this.setModal);
    // this.map.on('click', 'airports', this.setModal);

    this.map.on('dblclick', 'stations', (e) => {
      document.getElementsByClassName('mapboxgl-popup').forEach((popup) => {
        popup.remove();
      });
      const neighbors = this.getNeighbors(this.player.location);
      const { title } = e.features[0].properties;
      console.log(title, neighbors);
      if (neighbors.includes(title) && canMove(this.player) && !this.airports.includes(title)) {
        this.travel(this.playerMarker, title);
      }
    });
    this.map.on('dblclick', 'airports', (e) => {
      document.getElementsByClassName('mapboxgl-popup').forEach((popup) => {
        popup.remove();
      });
      const neighbors = this.getNeighbors(this.player.location);
      const { title } = e.features[0].properties;
      if (neighbors.includes(title) && canMove(this.player)) {
        this.travel(this.playerMarker, title);
      }
    });
  },
  watch: {
    game: [{
      deep: true,
      handler() {
        console.log('watch');
        this.oponentsMarker.forEach((oponent) => {
          const player = this.$store.getters['game/players'].find((player) => player.id === oponent.id);
          console.log(player.location);
          this.travel(oponent.marker, player.location, false, true);
        });
      },
    }],
  },
  methods: {
    async setMarker(city, color = '#fff') {
      return new mapboxgl.Marker({
        color,
        draggable: false,
      })
        .setLngLat(await this.getCity(city))
        .addTo(this.map);
    },
    async setPoints(name, data = [], color = '#fff') {
      const PromiseArray = data.map(async (city) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: await this.getCity(city),
        },
        properties: {
          title: city,
        },
      }));

      const coors = await Promise.all(PromiseArray);

      this.map.addSource(`${name}-points`, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: coors,
        },
      });

      this.map.addLayer({
        id: name,
        type: 'circle',
        source: `${name}-points`,
        paint: {
          'circle-radius': 10,
          'circle-color': color,
        },
      });
    },
    getCity(name = 'Paris, France') {
      return new Promise((resolve, reject) => {
        this.geocoder
          .forwardGeocode({
            query: name,
            autocomplete: false,
            limit: 1,
          })
          .send()
          .then((response) => {
            if (
              response
              && response.body
              && response.body.features
              && response.body.features.length
            ) {
              const feature = response.body.features[0];
              // resolve coordinates
              resolve(feature.center);
            }
          }).catch((err) => reject(err));
      });
    },
    async drawLine(routes, airplane = false) {
      const PromiseArray = routes.map(async (route) => {
        const line = {
          type: 'Feature',
          properties: {
            color: airplane ? '#ff0000' : '#00ff00',
          },
          geometry: {
            type: 'LineString',
            coordinates: [await this.getCity(route.origin), await this.getCity(route.destination)],
          },
        };
        if (airplane) {
          // Calculate the distance in kilometers between route start/end point.
          // Update the route with calculated arc coordinates
          line.geometry.coordinates = this.line2Arc(line);
        }
        return line;
      });

      const lines = await Promise.all(PromiseArray);

      this.map.addSource(airplane ? 'planes' : 'trains', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lines,
        },
      });

      this.map.addLayer({
        id: airplane ? 'planes-layer' : 'trains-layer',
        source: airplane ? 'planes' : 'trains',
        type: 'line',
        paint: {
          'line-width': 2,
          'line-color': ['get', 'color'],
        },
      });
    },
    async travel(marker, destination, airplane = false, view = false) {
      const markerCoor = marker.getLngLat();
      const destCoor = await this.getCity(destination);
      markerCoor.lng = parseFloat(markerCoor.lng);
      markerCoor.lat = parseFloat(markerCoor.lat);

      const origin = [markerCoor.lng, markerCoor.lat];
      const newPos = [markerCoor.lng, markerCoor.lat];
      const steps = 100;
      const lngDist = Math.abs(markerCoor.lng - destCoor[0]);
      const latDist = Math.abs(markerCoor.lat - destCoor[1]);

      const route = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [origin, destCoor],
            },
          },
        ],
      };

      if (airplane) {
        const arc = this.line2Arc(route.features[0]);

        // Update the route with calculated arc coordinates
        route.features[0].geometry.coordinates = arc;

        // Used to increment the value of the point measurement against the route.
        let counter = 0;

        while (counter < steps - 1) {
          const start = route.features[0].geometry.coordinates[
            counter >= steps ? counter - 1 : counter
          ];
          const end = route.features[0].geometry.coordinates[
            counter >= steps ? counter : counter + 1
          ];
          if (!start || !end) return;

          // Update point geometry to a new position based on counter denoting
          // the index to access the arc
          marker.setLngLat(route.features[0].geometry.coordinates[counter]);

          // Request the next frame of animation as long as the end has not been reached
          counter += 1;
          // eslint-disable-next-line no-await-in-loop
          await this.timeout(1);
        }
      } else {
        for (let i = 0; i < steps; i++) {
          if (newPos[0] < destCoor[0]) {
            newPos[0] += lngDist / steps;
          } else {
            newPos[0] -= lngDist / steps;
          }
          if (newPos[1] < destCoor[1]) {
            newPos[1] += latDist / steps;
          } else {
            newPos[1] -= latDist / steps;
          }
          marker.setLngLat(newPos);
          // eslint-disable-next-line no-await-in-loop
          await this.timeout(1);
        }
      }
      marker.setLngLat(destCoor);
      if (!view) {
        this.$store.dispatch('game/travel', { location: destination });

        this.destinationsMarker = this.destinationsMarker.filter((item) => {
          if (item.name === destination) {
            item.marker.remove();
            return false;
          }
          return true;
        });
        this.$p2p.sendGame();
      }
    },
    timeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    line2Arc(line) {
      const lineDistance = turf.length(line);
      const arc = [];
      const steps = 500;

      // Draw an arc between the `origin` & `destination` of the two points
      for (let i = 0; i < lineDistance; i += lineDistance / steps) {
        const segment = turf.along(line, i);
        arc.push(segment.geometry.coordinates);
      }

      return arc;
    },
    getNeighbors(city) {
      const neighbors = [];
      routes.forEach((route) => {
        if (route.origin === city) {
          neighbors.push(route.destination);
        }
        if (route.destination === city) {
          neighbors.push(route.origin);
        }
      });
      return neighbors;
    },
    setModal(e) {
      const { title } = e.features[0].properties;
      const coordinates = e.features[0].geometry.coordinates.slice();

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      const html = `<strong>${title}</strong>`;

      new mapboxgl.Popup({ closeOnMove: true })
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(this.map);
    },
  },
};
</script>
<style>
#map {
  position: absolute;
  z-index: -1;
  height: 100%;
  left: 0;
  right: 0;
  bottom: 0;
}
.destination-marker {
  background-size: cover;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
}
.start-marker {
  background-size: cover;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
}
</style>
