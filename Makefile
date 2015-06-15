MAKEFLAGS = -j1
BABEL_CMD = node_modules/babel/bin/babel

export NODE_ENV = test

.PHONY: clean build bootstrap build-core clean-core

build-core: clean-core
	node $(BABEL_CMD) src --out-dir lib --copy-files

clean-core:
	rm -rf lib

build:
	make build-core
	node tools/cache-templates

clean:
	rm -rf templates.json lib


