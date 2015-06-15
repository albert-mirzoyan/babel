export class BaseHandler {
    get settings(){
        return this.$.settings;
    }
    constructor(settings){
        this.configure(settings)
    }
    configure(settings):Handler{
        this.$ = {
            settings : settings
        };
        return this;
    }
    initialize(server){
        console.info(`Initializeing ${this.constructor.name}`);
    }
    handle(req,res){}
}
export default BaseHandler;


