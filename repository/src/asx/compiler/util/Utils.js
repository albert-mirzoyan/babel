/**
 * Created by Sergey on 1/22/15.
 */

import Path from 'node/path';
import FS from 'node/fs';

export class Utils{
    static makeDirectories(p,made) {
        if (!made) made = null;

        p = Path.resolve(p);

        try {
            FS.mkdirSync(p);
            made = made || p;
        }
        catch (e) {
            switch (e.code) {
                case 'ENOENT' :
                    made = Utils.makeDirectories(Path.dirname(p));
                    Utils.makeDirectories(p, opts, made);
                break;

                // In the case of any other error, just see if there's a dir
                // there already.  If so, then hooray!  If not, then something
                // is borked.
                default:
                    var stat;
                    try {
                        stat = FS.statSync(p);
                    }
                    catch (er) {
                        throw e;
                    }
                    if (!stat.isDirectory()) {
                        throw e;
                    }
                    break;
            }
        }

        return made;
    }
    
}