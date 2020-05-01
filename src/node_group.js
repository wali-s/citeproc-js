/*global CSL: true */

CSL.Node.group = {
    build: function (state, target, realGroup) {
        var func, execs, done_vars;
        this.realGroup = realGroup;
        if (this.tokentype === CSL.START) {
            CSL.Util.substituteStart.call(this, state, target);
            if (state.build.substitute_level.value()) {
                state.build.substitute_level.replace((state.build.substitute_level.value() + 1));
            }
            if (!this.juris) {
                target.push(this);
            }

            // newoutput
            func = function (state) {
                state.output.startTag("group", this);
                
                if (this.strings.label_form_override) {
                    if (!state.tmp.group_context.tip.label_form) {
                        state.tmp.group_context.tip.label_form = this.strings.label_form_override;
                    }
                }
                
                if (this.strings.label_capitalize_if_first_override) {
                    if (!state.tmp.group_context.tip.label_capitalize_if_first) {
                        state.tmp.group_context.tip.label_capitalize_if_first = this.strings.label_capitalize_if_first_override;
                    }
                }
                
                if (this.realGroup) {
                    var condition = false;
                    var force_suppress = false;

                    // XXX Can we do something better for length here?
                    if (state.tmp.group_context.mystack.length) {
                        state.output.current.value().parent = state.tmp.group_context.tip.output_tip;
                    }
                    
                    // fieldcontextflag
                    var label_form = state.tmp.group_context.tip.label_form;
                    if (!label_form) {
                        label_form = this.strings.label_form_override;
                    }
                    
                    var label_capitalize_if_first = state.tmp.group_context.tip.label_capitalize_if_first;
                    if (!label_capitalize_if_first) {
                        label_capitalize_if_first = this.strings.label_capitalize_if_first;
                    }
                    if (state.tmp.group_context.tip.condition) {
                        condition = state.tmp.group_context.tip.condition;
                        force_suppress = state.tmp.group_context.tip.force_suppress;
                        //force_suppress: false;
                    } else if (this.strings.reject) {
                        condition = {
                            test: this.strings.reject,
                            not: true
                        };
                        done_vars = [];
                    } else if (this.strings.require) {
                        condition = {
                            test: this.strings.require,
                            not: false
                        };
                        done_vars = [];
                    }
                    // CONDITION
                    //if (!state.tmp.just_looking) {
                    //    print("  pushing condition[" + state.tmp.group_context.mystack.length + "]: "+condition+" "+force_suppress);
                    //}
                    //if (!state.tmp.just_looking) {
                    //    var params = ["variable_success", "force_suppress","term_intended", "variable_attempt"]
                    //    print("PUSH parent="+JSON.stringify(state.tmp.group_context.tip, params))
                    //}
                    state.tmp.group_context.push({
                        old_term_predecessor: state.tmp.term_predecessor,
                        term_intended: false,
                        variable_attempt: false,
                        variable_success: false,
                        variable_success_parent: state.tmp.group_context.tip.variable_success,
                        output_tip: state.output.current.tip,
                        label_form: label_form,
                        label_capitalize_if_first: label_capitalize_if_first,
                        parallel_last: this.strings.parallel_last,
                        parallel_first: this.strings.parallel_first,
                        parallel_delimiter_override: this.strings.set_parallel_delimiter_override,
                        condition: condition,
                        force_suppress: force_suppress,
                        done_vars: state.tmp.group_context.tip.done_vars.slice()
                    });
                    //if (!state.tmp.just_looking) {
                    //    print("       flags="+JSON.stringify(state.tmp.group_context.tip, params))
                    //}
                }
            };
            //
            // Paranoia.  Assure that this init function is the first executed.
            execs = [];
            execs.push(func);
            this.execs = execs.concat(this.execs);

            // "Special handling" for nodes that contain only
            // publisher and place, with no affixes. For such
            // nodes only, parallel publisher/place pairs
            // will be parsed out and properly joined, piggybacking on
            // join parameters set on cs:citation or cs:bibliography.
            if (this.strings["has-publisher-and-publisher-place"]) {
                // Pass variable string values to the closing
                // tag via a global, iff they conform to expectations.
                state.build["publisher-special"] = true;
                if (this.strings["subgroup-delimiter"]) {
                    // Set the handling function only if name-delimiter
                    // is set on the parent cs:citation or cs:bibliography
                    // node.
                    func = function (state, Item) {
                        if (Item.publisher && Item["publisher-place"]) {
                            var publisher_lst = Item.publisher.split(/;\s*/);
                            var publisher_place_lst = Item["publisher-place"].split(/;\s*/);
                            if (publisher_lst.length > 1
                                && publisher_lst.length === publisher_place_lst.length) {
                                state.publisherOutput = new CSL.PublisherOutput(state, this);
                                state.publisherOutput["publisher-list"] = publisher_lst;
                                state.publisherOutput["publisher-place-list"] = publisher_place_lst;
                            }
                        }
                    };
                    this.execs.push(func);
                }
            }

            if (this.juris) {
                // "Special handling" for jurisdiction macros
                // We try to instantiate these as standalone token lists.
                // If available, the token list is executed,
                // the result is written directly into output,
                // and control returns here.

                // So we'll have something like this:
                // * expandMacro() in util_node.js flags juris- macros
                //   on build. [DONE]
                // * Those are picked up here, and
                //   - A runtime function attempts to fetch and instantiate
                //     the macros in separate token lists under a segment
                //     opened for the jurisdiction. We assume that the
                //     jurisdiction has a full set of macros. That will need
                //     to be enforced by validation. [DONE HERE, function is TODO]
                //   - Success or failure is marked in a runtime flag object
                //     (in citeproc.opt). [DONE]
                //   - After the instantiation function comes a test, for
                //     juris- macros only, which either runs diverted code,
                //     or proceeds as per normal through the token list. [TODO]
                // I think that's all there is to it.
                
                // Code for fetching an instantiating?

                var choose_start = new CSL.Token("choose", CSL.START);
                CSL.Node.choose.build.call(choose_start, state, target);
                
                var if_start = new CSL.Token("if", CSL.START);

                func = (function (macroName) {
                    return function (Item) {
                        return CSL.INIT_JURISDICTION_MACROS(state, Item, macroName);
                    }
                }(this.juris));
                
                if_start.tests ? {} : if_start.tests = [];
                if_start.tests.push(func);
                if_start.test = state.fun.match.any(if_start, state, if_start.tests);
                target.push(if_start);
                var text_node = new CSL.Token("text", CSL.SINGLETON);
                func = function (state, Item, item) {
                    // This will run the juris- token list.
                    var next = 0;
                    if (state.juris[Item["best-jurisdiction"]][this.juris]) {
                        while (next < state.juris[Item["best-jurisdiction"]][this.juris].length) {
                            next = CSL.tokenExec.call(state, state.juris[Item["best-jurisdiction"]][this.juris][next], Item, item);
                        }
                    }
                };
                text_node.juris = this.juris;
                text_node.execs.push(func);
                target.push(text_node);

                var if_end = new CSL.Token("if", CSL.END);
                CSL.Node["if"].build.call(if_end, state, target);
                var else_start = new CSL.Token("else", CSL.START);
                CSL.Node["else"].build.call(else_start, state, target);
            }
        }

        if (this.tokentype === CSL.END) {
            
            // Unbundle and print publisher lists
            // Same constraints on creating the necessary function here
            // as above. The full content of the group formatting token
            // is apparently not available on the closing tag here,
            // hence the global flag on state.build.
            if (state.build["publisher-special"]) {
                state.build["publisher-special"] = false;
                func = function (state) {
                    if (state.publisherOutput) {
                        state.publisherOutput.render();
                        state.publisherOutput = false;
                    }
                };
                this.execs.push(func);
            }
            
            // quashnonfields
            func = function (state, Item, item) {
                state.output.endTag();
                if (this.realGroup) {
                    var flags = state.tmp.group_context.pop();
                    if (state.tmp.area === "bibliography_sort") {
                        var citationNumberIdx = flags.done_vars.indexOf("citation-number");
                        if (this.strings.sort_direction && citationNumberIdx > -1 && state.tmp.group_context.length() == 1) {
                            if (this.strings.sort_direction === CSL.DESCENDING) {
                                state.bibliography_sort.opt.citation_number_sort_direction = CSL.DESCENDING;
                            } else {
                                state.bibliography_sort.opt.citation_number_sort_direction = CSL.ASCENDING;
                            }
                            flags.done_vars = flags.done_vars.slice(0, citationNumberIdx).concat(flags.done_vars.slice(citationNumberIdx + 1))
                        }
                    }
                    //var params = ["condition", "variable_success", "force_suppress","term_intended", "variable_attempt"]
                    //if (!state.tmp.just_looking) {
                    //    print("POP parent="+JSON.stringify(state.tmp.group_context.tip, params))
                    //    print("    flags="+JSON.stringify(flags, params));
                    //}
                    if (flags.condition) {
                        flags.force_suppress = CSL.EVALUATE_GROUP_CONDITION(state, flags);
                    }
                    if (state.tmp.group_context.tip.condition) {
                        state.tmp.group_context.tip.force_suppress = flags.force_suppress;
                    }
                    if (!flags.force_suppress && (flags.variable_success || (flags.term_intended && !flags.variable_attempt))) {
                        if (!this.isJurisLocatorLabel) {
                            state.tmp.group_context.tip.variable_success = true;
                        }
                        var blobs = state.output.current.value().blobs;
                        var pos = state.output.current.value().blobs.length - 1;
                        if (!state.tmp.just_looking && (flags.parallel_last || flags.parallel_first || flags.parallel_delimiter_override)) {
                            // flags.parallel_last
                            // flags.parallel_first
                            var hasRepeat = state.parallel.checkRepeats(flags);
                            if (hasRepeat) {
                                if (blobs) {
                                    blobs.pop();
                                }
                            }
                            if (state.tmp.cite_index > 0 && (hasRepeat || (!flags.parallel_first && !flags.parallel_last))) {
                                //state.sys.print(`${state.tmp.cite_index} ${JSON.stringify(state.tmp.suppress_repeats, null, 2)}`)
                                if (flags.parallel_delimiter_override && state.tmp.suppress_repeats[state.tmp.cite_index-1].SIBLING) {
                                    state.output.queue.slice(-1)[0].parallel_delimiter = flags.parallel_delimiter_override;
                                }
                            }
                        }
                    } else {
                        state.tmp.term_predecessor = flags.old_term_predecessor;
                        state.tmp.group_context.tip.variable_attempt = flags.variable_attempt;
                        if (flags.force_suppress && !state.tmp.group_context.tip.condition) {
                            state.tmp.group_context.tip.variable_attempt = true;
                            state.tmp.group_context.tip.variable_success = flags.variable_success_parent;
                        }
                        if (flags.force_suppress) {
                            // 2019-04-15
                            // This is removing variables done within the group we're leaveing from global
                            // done_vars? How does that make sense?
                            // Ah. This is a FAILURE. So removing from done_vars allows it to re-render
                            // later in the cite if desired.
                            // Currently no tests fail from removing the condition, but leaving it in.
                            for (var i=0,ilen=flags.done_vars.length;i<ilen;i++) {
                                var doneVar = flags.done_vars[i];
                                for (var j=0,jlen=state.tmp.done_vars.length; j<jlen; j++) {
                                    if (state.tmp.done_vars[j] === doneVar) {
                                        state.tmp.done_vars = state.tmp.done_vars.slice(0, j).concat(state.tmp.done_vars.slice(j+1));
                                    }
                                }
                            }
                        }
                        if (state.output.current.value().blobs) {
                            state.output.current.value().blobs.pop();
                        }
                    }
                }
            };
            this.execs.push(func);
            
            if (this.juris) {
                var else_end = new CSL.Token("else", CSL.END);
                CSL.Node["else"].build.call(else_end, state, target);
                var choose_end = new CSL.Token("choose", CSL.END);
                CSL.Node.choose.build.call(choose_end, state, target);
            }
        }

        if (this.tokentype === CSL.END) {
            if (!this.juris) {
                target.push(this);
            }
            if (state.build.substitute_level.value()) {
                state.build.substitute_level.replace((state.build.substitute_level.value() - 1));
            }
            CSL.Util.substituteEnd.call(this, state, target);
        }
    }
};

