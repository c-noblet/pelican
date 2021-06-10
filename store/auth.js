import { patch } from '../plugins/utils';

export const state = () => ({
  id: null,
  name: null,
});

export const getters = {
  user(state) {
    return state;
  },
};

export const mutations = {
  USER(state, payload) {
    patch(state, payload);
  },
};

export const actions = {
  async setUserInfos({ commit }) {
    if (!localStorage.getItem('player')) {
      const username = prompt('Choose a username');
      const peerId = await this.$p2p.init();
      const playerSession = {
        id: peerId,
        name: username,
      };
      localStorage.setItem('player', JSON.stringify(playerSession));
      commit('USER', playerSession);
    } else {
      const playerSession = JSON.parse(localStorage.getItem('player'));
      await this.$p2p.init(playerSession.id);
      commit('USER', playerSession);
    }
  },

};
