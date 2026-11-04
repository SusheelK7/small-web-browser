import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Person {
  @Prop({ required: true, unique: true }) name: string;
}
export const PersonSchema = SchemaFactory.createForClass(Person);

@Schema()
export class Site {
  @Prop({ required: true, unique: true }) address: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) html: string;
  @Prop({ required: true }) text: string;
  @Prop({ required: true }) author: string;
}
export const SiteSchema = SchemaFactory.createForClass(Site);
SiteSchema.index({ title: 'text', text: 'text' }, { weights: { title: 5, text: 1 } });

@Schema()
export class Visit {
  @Prop({ required: true }) person: string;
  @Prop({ required: true }) address: string;
  @Prop({ required: true }) at: Date;
  @Prop({ required: true, enum: ['typed', 'link', 'back', 'forward', 'history', 'search'] }) via: string;
  @Prop({ required: true }) found: boolean;
}
export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ person: 1, at: -1 });