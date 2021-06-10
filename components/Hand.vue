<template>
  <ul class="hand">
    <li @click="playCard(card)" class="card" v-for="card in player.hand" :key="card.id">
      {{ card.name }}
    </li>
  </ul>
</template>
<script>
export default {
  name: 'Hand',
  computed: {
    player() {
      return this.$store.getters['game/player'];
    },
    game() {
      return this.$store.getters['game/game'];
    },
  },
  methods: {
    playCard(card) {
      if (this.game.turn === this.player.turnPosition) {
        this.$store.dispatch('game/playCard', card);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.hand {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;

  .card {
    cursor: pointer;
    display: inline-block;
    margin: 0 1%;
    background-color: #fff;
    padding: 1rem;
    transition: transform ease-in-out 0.2s;

    &:hover {
      transform: translateY(-1rem);
    }
  }
}
</style>
