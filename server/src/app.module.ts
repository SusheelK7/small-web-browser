import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema, Site, SiteSchema, Visit, VisitSchema } from './schemas';
import { WebController } from './web.controller';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: Site.name, schema: SiteSchema },
      { name: Visit.name, schema: VisitSchema },
    ]),
  ],
  controllers: [WebController],
})
export class AppModule {}