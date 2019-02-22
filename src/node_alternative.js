/*global CSL: true */

CSL.Node.alternative = {
    build: function (state, target) {
        if (this.tokentype === CSL.START) {
            // do stuff
            var choose_tok = new CSL.Token("choose", CSL.START);
            CSL.Node["choose"].build.call(choose_tok, state, target);

            var if_tok = new CSL.Token("if", CSL.START);
            CSL.Attributes["@alternative-node-internal"].call(if_tok, state);
            CSL.Node["if"].build.call(if_tok, state, target);

            var func = function(state, Item) {

                state.tmp.oldItem = Item;
                state.tmp.running_alternative = true;
                state.output.openLevel(this);

                var newItem = JSON.parse(JSON.stringify(Item));
                
                newItem.language = newItem["language-name"];
                var langspec = CSL.localeResolve(newItem.language, state.opt["default-locale"][0]);
                state.opt.lang = langspec.best;
                for (var i in CSL.CREATORS) {
                    var key = CSL.CREATORS[i];
                    if (newItem[key]) {
                        delete newItem[key];
                    }
                }
                for (var key in newItem) {
                    if (key.slice(0, 4) === "alt-") {
                        newItem[key.slice(4)] = newItem[key];
                    } else {
                        if (!newItem["alt-" + key] && newItem.multi[key]) {
                            if (newItem.multi[key][langspec.best]) {
                                newItem[key] = newItem.multi[key][langspec.best];
                            } else if (newItem.multi[key][langspec.base]) {
                                newItem[key] = newItem.multi[key][langspec.base];
                            } else if (newItem.multi[key][langspec.bare]) {
                                newItem[key] = newItem.multi[key][langspec.bare];
                            }
                        }
                    }
                }
                state.registry.refhash[Item.id] = newItem;
                state.nameOutput = new CSL.NameOutput(state, newItem);
            }
            this.execs.push(func);
            target.push(this);
        } else if (this.tokentype === CSL.END) {
            var func = function(state, Item) {
                state.output.closeLevel();
                state.registry.refhash[Item.id] = state.tmp.oldItem;
                state.nameOutput = new CSL.NameOutput(state, state.tmp.oldItem);
                state.tmp.running_alternative = true;
            }
            this.execs.push(func);
            target.push(this);

            var if_tok = new CSL.Token("if", CSL.END);
            CSL.Node["if"].build.call(if_tok, state, target);

            var choose_tok = new CSL.Token("choose", CSL.END);
            CSL.Node["choose"].build.call(choose_tok, state, target);

        }
    }
};
