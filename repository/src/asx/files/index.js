import FS from 'node/fs';
import PATH from 'node/path';

class Files {
    resolve(...args) {
        return PATH.resolve(...args);
    }
    extname(path) {
        return PATH.extname(path)
    }
    extension(path) {
        return this.extname(path).substring(1);
    }
    relative(path, base) {
        return PATH.relative(path, base);
    }
    watch(path, options, listener) {
        FS.watch(path, options, listener);
    }
    dirname(path) {
        return PATH.dirname(path);
    }
    exists(path) {
        return FS.existsSync(path);
    }
    isFile(path) {
        return (this.exists(path) && FS.statSync(path).isFile());
    }
    isDirectory(path) {
        return (this.exists(path) && FS.statSync(path).isDirectory());
    }
    copyFile(source, target) {
        this.writeFile(target, this.readFile(source, 'binary'), 'binary');
    }
    readFile(path, enc) {
        return FS.readFileSync(path, enc || 'utf8');
    }
    writeFile(path, data, enc) {
        var dir = this.dirname(path);
        if (!this.isDirectory(dir)) {
            this.makeDirRecursive(dir)
        }
        return FS.writeFileSync(path, data, enc || 'utf8');
    }
    readJson(path) {
        return JSON.parse(this.readFile(path));
    }
    makeDirRecursive(dir) {
        var parts = PATH.normalize(dir).split(PATH.sep);
        dir = '';
        for (var i = 0; i < parts.length; i++) {
            dir += parts[i] + PATH.sep;
            if (!FS.existsSync(dir)) {
                FS.mkdirSync(dir, 0x1FD);
            }
        }
    }
    readDirRecursive(dir) {
        var items = FS.readdirSync(dir).map(s=> {
            return PATH.resolve(dir, s);
        });
        var files = [], dirs = [];
        items.forEach(f=> {
            if (FS.statSync(f).isDirectory()) {
                dirs.push(f);
            } else {
                files.push(f);
            }
        });
        dirs.forEach(d=> {
            files = files.concat(Files.readDirRecursive(d));
        });
        return files;
    }
}

export default new Files();