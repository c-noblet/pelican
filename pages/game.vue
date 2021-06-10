<template>
  <div class="game">
    <Map />
    <div class="destinations">
      <div class="game-id">{{ game.id }}</div>
      <div v-if="player.turnPosition === game.turn"> Your turn</div>
      <div>{{ player.movement }} : {{ player.maxSpeed }}</div>
      <div>
        Départ : {{ player.startLocation }}
      </div>
      <div>
        Ville actuelle : {{ player.location }}
      </div>
      <div v-for="(destination, index) in player.destinations" :key="index">
        {{ destination }}
      </div>
      <div>
        <button @click="draw">Draw</button>
      </div>
      <div>
        <button @click="endTurn">End Turn</button>
      </div>
    </div>
    <Hand />
  </div>
</template>
<script>
import Map from '../components/Map.vue';
import Hand from '../components/Hand.vue';

export default {
  name: 'game',
  computed: {
    player() {
      return this.$store.getters['game/player'];
    },
    game() {
      return this.$store.getters['game/game'];
    },
  },
  components: {
    Map,
    Hand,
  },
  data() {
    return {
      canDraw: true,
    };
  },
  methods: {
    endTurn() {
      if (this.game.turn === this.player.turnPosition) {
        this.canDraw = true;
        this.$store.commit('game/ENDTURN');
        this.$p2p.sendGame();
      }
    },
    draw() {
      if (this.game.turn === this.player.turnPosition && this.canDraw) {
        this.canDraw = false;
        this.$store.dispatch('game/draw');
        this.$p2p.sendGame();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.destinations {
  position: absolute;
  top: 0;
  left: 0;
  background-color: #fff;
}
</style>
