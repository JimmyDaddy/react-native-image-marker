export default {
  plugins: [
    {
      name: 'record-consumer-module-graph',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'module-graph.json',
          source: JSON.stringify([...this.getModuleIds()].sort(), null, 2),
        });
      },
    },
  ],
};
